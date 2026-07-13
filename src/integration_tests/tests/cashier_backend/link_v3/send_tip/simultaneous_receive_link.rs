// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::action::{CreateActionInputV3, ProcessActionInputV3, ProcessActionResponseV3},
    repository::action::v1::ActionType,
};
use cashier_shared::types::{ActionState as ActionStateShared, LinkState as LinkStateShared};
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, send_tip::fixture::activate_tip_link_v3_fixture,
    },
    constant::ICP_TOKEN,
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_not_corrupt_link_when_two_users_claim_simultaneously() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: an activated ICP tip link (max_use = 1) funded for exactly one claim.
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(TestUser::User1.get_principal());
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            token,
            tip_amount.clone(),
            icp_fee.clone(),
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

        // Each receiver creates their own RECEIVE action (creating an action does not move
        // the link's funds, so this part is fine to run sequentially).
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

        // Act: submit BOTH process_action calls BEFORE awaiting either, so they execute in
        // the same round and interleave at the ledger `.await` (true concurrency).
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

        // Assert: exactly one claim is a successful claim (the other fails / is not success).
        let success_count = [&res1, &res2]
            .iter()
            .filter(|r| matches!(r, Ok(resp) if resp.is_success))
            .count();
        assert_eq!(
            success_count, 1,
            "exactly one concurrent claim must succeed, got res1={res1:?}, res2={res2:?}"
        );

        // Assert: link is NOT corrupted — stays terminal, used once, fully drained.
        let link = receiver1_fixture
            .get_link_details_v3(&link_id, None)
            .await
            .unwrap()
            .link;
        assert_eq!(
            link.link_state,
            LinkStateShared::Ended,
            "link must stay Ended (a failed concurrent claim must not resurrect it to Active)"
        );
        assert_eq!(link.use_count, 1, "use_count must be exactly 1");
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(0u64)),
            "available_amount must remain drained (not restored by the stale write-back)"
        );

        // Assert: the link account is fully drained — no over-claim / double-spend.
        let link_account = link_id_to_account(&receiver1_fixture.ctx, &link_id);
        let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(link_balance, Nat::from(0u64), "link account must be empty");

        // Assert: exactly one receiver actually received the tip.
        let bal1 = icp_ledger_client
            .balance_of(&Account {
                owner: receiver1,
                subaccount: None,
            })
            .await
            .unwrap();
        let bal2 = icp_ledger_client
            .balance_of(&Account {
                owner: receiver2,
                subaccount: None,
            })
            .await
            .unwrap();
        let paid_receivers = [&bal1, &bal2].iter().filter(|b| ***b == tip_amount).count();
        assert_eq!(
            paid_receivers, 1,
            "exactly one receiver should receive the tip (bal1={bal1}, bal2={bal2})"
        );

        // Assert: exactly one receiver has a successfully completed action (backend user-state guard).
        let options = GetLinkOptions {
            action_type: ActionType::Receive,
        };
        let actions1 = receiver1_fixture
            .get_link_details_v3(&link_id, Some(options.clone()))
            .await
            .unwrap()
            .actions;
        let actions2 = receiver2_fixture
            .get_link_details_v3(&link_id, Some(options))
            .await
            .unwrap()
            .actions;
        let completed_count = [&actions1, &actions2]
            .iter()
            .filter(|actions| {
                actions
                    .first()
                    .is_some_and(|a| a.action_state == ActionStateShared::Success)
            })
            .count();
        assert_eq!(
            completed_count, 1,
            "exactly one receiver must have a successfully completed action, got actions1={actions1:?}, actions2={actions2:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}
