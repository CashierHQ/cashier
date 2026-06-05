// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::action::{CreateActionInputV3, ProcessActionInputV3, ProcessActionResponseV3},
    repository::{action::v1::ActionType, link_action::v1::LinkUserState},
};
use cashier_shared::types::LinkState as LinkStateShared;
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, send_basket::fixture::activate_basket_link_v3_fixture,
    },
    constant::{CKBTC_ICRC_TOKEN, CKUSDC_ICRC_TOKEN, EXTRA_BASKET_TOKENS},
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};

/// Builds the list of 10 distinct ICRC tokens for the basket: ckBTC + ckUSDC + 8 generic
/// basket ledgers. All are ICRC2, so the test code can treat every asset uniformly.
fn ten_basket_tokens() -> Vec<String> {
    let mut tokens = vec![
        CKBTC_ICRC_TOKEN.to_string(),
        CKUSDC_ICRC_TOKEN.to_string(),
    ];
    tokens.extend(EXTRA_BASKET_TOKENS.iter().map(|s| s.to_string()));
    tokens
}

#[tokio::test]
async fn it_should_not_corrupt_basket_link_when_two_users_claim_simultaneously() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: 10-asset basket, each asset funded for exactly one claim.
        let creator = TestUser::User1.get_principal();
        let tokens = ten_basket_tokens();
        let amount_per_asset = Nat::from(1_000_000u64);

        let icp_ledger_client = ctx.new_icp_ledger_client(creator);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();

        // Per-asset amounts/fees (query each ledger's real fee; uniform amount).
        let mut amounts = Vec::with_capacity(tokens.len());
        let mut token_fees = Vec::with_capacity(tokens.len());
        for token in tokens.iter() {
            let fee = ctx
                .new_icrc_ledger_client(token, creator)
                .fee()
                .await
                .unwrap();
            amounts.push(amount_per_asset.clone());
            token_fees.push(fee);
        }

        let (creator_fixture, create_link_result) = activate_basket_link_v3_fixture(
            ctx,
            tokens.clone(),
            amounts.clone(),
            token_fees.clone(),
            icp_fee.clone(),
        )
        .await;
        let link_id = create_link_result.link.id.clone();

        // Two distinct receivers, each with their own caller-bound client.
        let receiver1 = TestUser::User2.get_principal();
        let receiver2 = TestUser::User3.get_principal();
        let receiver1_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver1, icp_fee.clone()).await;
        let receiver2_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver2, icp_fee.clone()).await;

        // Each receiver creates their own RECEIVE action (this does not move link funds).
        let action1 = receiver1_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver1_fixture.receive_action(link_id.clone(), receiver1),
            })
            .await
            .expect("receiver1 create RECEIVE action should succeed");
        let action2 = receiver2_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver2_fixture.receive_action(link_id.clone(), receiver2),
            })
            .await
            .expect("receiver2 create RECEIVE action should succeed");

        // Each RECEIVE action must fan out into 10 intents (one per basket asset).
        assert_eq!(action1.action.intents.len(), 10);
        assert_eq!(action2.action.intents.len(), 10);

        // Act: submit BOTH process_action calls BEFORE awaiting either, so they execute in the
        // same round and interleave at the ledger `.await` (true concurrency).
        let msg1 = receiver1_fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .submit_process_action_v3(ProcessActionInputV3 {
                action_id: action1.action.id.clone(),
            })
            .await
            .unwrap();
        let msg2 = receiver2_fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .submit_process_action_v3(ProcessActionInputV3 {
                action_id: action2.action.id.clone(),
            })
            .await
            .unwrap();

        let res1: Result<ProcessActionResponseV3, CanisterError> = receiver1_fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .await_call(msg1)
            .await
            .unwrap();
        let res2: Result<ProcessActionResponseV3, CanisterError> = receiver2_fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .await_call(msg2)
            .await
            .unwrap();

        // Assert: exactly one claim is a successful claim.
        let res1_ok = matches!(&res1, Ok(resp) if resp.is_success);
        let res2_ok = matches!(&res2, Ok(resp) if resp.is_success);
        assert!(
            res1_ok ^ res2_ok,
            "exactly one concurrent claim must succeed, got res1={res1:?}, res2={res2:?}"
        );
        let (winner, loser) = if res1_ok {
            (receiver1, receiver2)
        } else {
            (receiver2, receiver1)
        };

        // Assert: link is NOT corrupted — terminal, used once, all 10 assets drained.
        let link = receiver1_fixture
            .get_link_details_v3(&link_id, None)
            .await
            .unwrap()
            .link;
        assert_eq!(
            link.link_state,
            LinkStateShared::Ended,
            "link must stay Ended (a failed concurrent claim must not resurrect it)"
        );
        assert_eq!(link.use_count, 1, "use_count must be exactly 1");
        assert_eq!(link.asset_info.len(), 10, "basket must have 10 assets");
        for asset in link.asset_info.iter() {
            assert_eq!(
                asset.available_amount,
                Some(Nat::from(0u64)),
                "every asset's available_amount must remain drained"
            );
        }

        // Assert per-asset ledger state: link account drained, winner paid, loser not paid.
        let link_account = link_id_to_account(&receiver1_fixture.ctx, &link_id);
        let winner_account = Account {
            owner: winner,
            subaccount: None,
        };
        let loser_account = Account {
            owner: loser,
            subaccount: None,
        };
        for token in tokens.iter() {
            let ledger = ctx.new_icrc_ledger_client(token, winner);

            let link_balance = ledger.balance_of(&link_account).await.unwrap();
            assert_eq!(
                link_balance,
                Nat::from(0u64),
                "link account for {token} must be empty (no leftover / over-drain)"
            );

            let winner_balance = ledger.balance_of(&winner_account).await.unwrap();
            assert_eq!(
                winner_balance, amount_per_asset,
                "winner must receive exactly the tip amount for {token}"
            );

            let loser_balance = ledger.balance_of(&loser_account).await.unwrap();
            assert_eq!(
                loser_balance,
                Nat::from(0u64),
                "loser must not receive any {token}"
            );
        }

        // Assert: exactly one receiver is marked Completed (backend user-state guard).
        let options = GetLinkOptions {
            action_type: ActionType::Receive,
        };
        let state1 = receiver1_fixture
            .get_link_details_v3(&link_id, Some(options.clone()))
            .await
            .unwrap()
            .link_user_state;
        let state2 = receiver2_fixture
            .get_link_details_v3(&link_id, Some(options))
            .await
            .unwrap()
            .link_user_state;
        let completed_count = [&state1, &state2]
            .iter()
            .filter(|s| ***s == Some(LinkUserState::Completed))
            .count();
        assert_eq!(
            completed_count, 1,
            "exactly one receiver must be Completed, got state1={state1:?}, state2={state2:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}
