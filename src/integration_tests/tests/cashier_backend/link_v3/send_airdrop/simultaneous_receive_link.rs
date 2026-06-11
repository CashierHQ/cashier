// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::action::{CreateActionInputV3, ProcessActionInputV3, ProcessActionResponseV3},
    repository::{action::v1::ActionType, link_action::v1::LinkUserState},
};
use cashier_common::test_utils;
use cashier_shared::types::LinkState as LinkStateShared;
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, send_airdrop::fixture::activate_airdrop_link_v3_fixture,
    },
    constant::ICP_TOKEN,
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_not_corrupt_airdrop_link_when_two_users_claim_simultaneously() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: an activated ICP airdrop link (max_use = 1) funded for exactly one claim.
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 1;
        let icp_ledger_client = ctx.new_icp_ledger_client(TestUser::User1.get_principal());
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, create_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount.clone(),
            max_use_count,
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

        // Assert: link is NOT corrupted — terminal, used once, drained.
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
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(0u64)),
            "available_amount must remain drained"
        );

        // Assert: link account drained, winner paid, loser not paid.
        let link_account = link_id_to_account(&receiver1_fixture.ctx, &link_id);
        let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(link_balance, Nat::from(0u64), "link account must be empty");

        let winner_balance = icp_ledger_client
            .balance_of(&Account {
                owner: winner,
                subaccount: None,
            })
            .await
            .unwrap();
        assert_eq!(
            winner_balance, airdrop_amount,
            "winner must receive exactly the airdrop amount"
        );

        let loser_balance = icp_ledger_client
            .balance_of(&Account {
                owner: loser,
                subaccount: None,
            })
            .await
            .unwrap();
        assert_eq!(
            loser_balance,
            Nat::from(0u64),
            "loser must not receive any tokens"
        );

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

#[tokio::test]
async fn it_should_leave_one_use_when_airdrop_max_use_three_claimed_by_two_users_simultaneously() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: an activated ICP airdrop link with 3 uses, funded for 3 claims.
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 3;
        let icp_ledger_client = ctx.new_icp_ledger_client(TestUser::User1.get_principal());
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount.clone(),
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let link_id = activate_link_result.link.id.clone();
        let initial_available_amount = activate_link_result.link.asset_info[0]
            .available_amount
            .clone();

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

        // Act: submit BOTH process_action calls BEFORE awaiting either (true concurrency).
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

        // Assert: BOTH claims succeed (link funded for 3, only 2 claim).
        assert!(
            matches!(&res1, Ok(resp) if resp.is_success),
            "receiver1 claim should succeed, got {res1:?}"
        );
        assert!(
            matches!(&res2, Ok(resp) if resp.is_success),
            "receiver2 claim should succeed, got {res2:?}"
        );

        // Assert: link correctly accounts for exactly two uses — one use left, still Active.
        let link = receiver1_fixture
            .get_link_details_v3(&link_id, None)
            .await
            .unwrap()
            .link;
        assert_eq!(link.max_use, 3);
        assert_eq!(
            link.use_count, 2,
            "two simultaneous claims must count as two uses (one use left), not collapse via a lost update"
        );
        assert_eq!(
            link.link_state,
            LinkStateShared::Active,
            "link must stay Active with one use remaining"
        );
        assert_eq!(
            link.asset_info[0].available_amount,
            initial_available_amount.map(|available| {
                available - (airdrop_amount.clone() + icp_fee.clone()) * Nat::from(2u64)
            }),
            "available_amount must be reduced by exactly two claims"
        );

        // Assert: link account still funded for exactly one more claim.
        let link_account = link_id_to_account(&receiver1_fixture.ctx, &link_id);
        let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                airdrop_amount.clone(),
                icp_fee.clone(),
                max_use_count - 2,
            ),
            "link account must retain funding for the one remaining use"
        );

        // Assert: BOTH receivers were paid, and BOTH are marked Completed.
        for receiver in [receiver1, receiver2] {
            let balance = icp_ledger_client
                .balance_of(&Account {
                    owner: receiver,
                    subaccount: None,
                })
                .await
                .unwrap();
            assert_eq!(
                balance, airdrop_amount,
                "each successful receiver must get exactly one airdrop amount"
            );
        }

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
        assert_eq!(state1, Some(LinkUserState::Completed));
        assert_eq!(state2, Some(LinkUserState::Completed));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_cap_at_max_use_when_oversubscribed() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: airdrop with 2 uses, funded for exactly 2 claims.
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 2;
        let icp_ledger_client = ctx.new_icp_ledger_client(TestUser::User1.get_principal());
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount.clone(),
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let link_id = activate_link_result.link.id.clone();

        // Three distinct receivers, each with their own RECEIVE action.
        let receivers = [
            TestUser::User2.get_principal(),
            TestUser::User3.get_principal(),
            TestUser::User4.get_principal(),
        ];
        let mut fixtures = Vec::new();
        let mut action_ids = Vec::new();
        for receiver in receivers {
            let fixture =
                LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone())
                    .await;
            let action = fixture
                .create_action_v3(CreateActionInputV3 {
                    link_id: link_id.clone(),
                    action: fixture.receive_action(link_id.clone(), receiver),
                })
                .await
                .expect("create RECEIVE action should succeed");
            action_ids.push(action.action.id.clone());
            fixtures.push(fixture);
        }

        // Act: submit ALL THREE process_action calls before awaiting any → true concurrency.
        let mut msgs = Vec::new();
        for (fixture, action_id) in fixtures.iter().zip(action_ids.iter()) {
            let msg = fixture
                .cashier_backend_client
                .as_ref()
                .unwrap()
                .submit_process_action_v3(ProcessActionInputV3 {
                    action_id: action_id.clone(),
                })
                .await
                .unwrap();
            msgs.push(msg);
        }
        let mut results: Vec<Result<ProcessActionResponseV3, CanisterError>> = Vec::new();
        for (fixture, msg) in fixtures.iter().zip(msgs.into_iter()) {
            results.push(
                fixture
                    .cashier_backend_client
                    .as_ref()
                    .unwrap()
                    .await_call(msg)
                    .await
                    .unwrap(),
            );
        }

        // Assert: exactly two claims succeed; the third is rejected (Err or not is_success).
        let success_count = results
            .iter()
            .filter(|r| matches!(r, Ok(resp) if resp.is_success))
            .count();
        assert_eq!(
            success_count, 2,
            "exactly two of three concurrent claims must succeed, got {results:?}"
        );

        // Assert: link capped at max_use — exactly two uses, terminal, drained (no over-claim).
        let link = creator_fixture
            .get_link_details_v3(&link_id, None)
            .await
            .unwrap()
            .link;
        assert_eq!(link.max_use, 2);
        assert_eq!(
            link.use_count, 2,
            "use_count must be exactly 2 (no over-claim)"
        );
        assert_eq!(link.link_state, LinkStateShared::Ended);
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));

        // Assert: link account fully drained; exactly two receivers paid.
        let link_account = link_id_to_account(&creator_fixture.ctx, &link_id);
        assert_eq!(
            icp_ledger_client.balance_of(&link_account).await.unwrap(),
            Nat::from(0u64),
            "link account must be empty"
        );
        let mut paid = 0;
        for receiver in receivers {
            let bal = icp_ledger_client
                .balance_of(&Account {
                    owner: receiver,
                    subaccount: None,
                })
                .await
                .unwrap();
            if bal == airdrop_amount {
                paid += 1;
            } else {
                assert_eq!(
                    bal,
                    Nat::from(0u64),
                    "a non-winning receiver must be unpaid"
                );
            }
        }
        assert_eq!(paid, 2, "exactly two receivers should be paid");

        // Assert: exactly two receivers are Completed.
        let options = GetLinkOptions {
            action_type: ActionType::Receive,
        };
        let mut completed = 0;
        for fixture in fixtures.iter() {
            let state = fixture
                .get_link_details_v3(&link_id, Some(options.clone()))
                .await
                .unwrap()
                .link_user_state;
            if state == Some(LinkUserState::Completed) {
                completed += 1;
            }
        }
        assert_eq!(completed, 2, "exactly two receivers must be Completed");

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_not_double_commit_link_when_claimer_retries_processed_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: an activated ICP airdrop link with 3 uses; one receiver claims once.
        let token = ICP_TOKEN;
        let airdrop_amount = Nat::from(1_000_000u64);
        let max_use_count = 3;
        let icp_ledger_client = ctx.new_icp_ledger_client(TestUser::User1.get_principal());
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (creator_fixture, activate_link_result) = activate_airdrop_link_v3_fixture(
            ctx,
            token,
            airdrop_amount.clone(),
            max_use_count,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let link_id = activate_link_result.link.id.clone();
        let initial_available_amount = activate_link_result.link.asset_info[0]
            .available_amount
            .clone();

        let receiver = TestUser::User2.get_principal();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee.clone()).await;
        let action = receiver_fixture
            .create_action_v3(CreateActionInputV3 {
                link_id: link_id.clone(),
                action: receiver_fixture.receive_action(link_id.clone(), receiver),
            })
            .await
            .expect("receiver create RECEIVE action should succeed");

        let first: Result<ProcessActionResponseV3, CanisterError> = receiver_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: action.action.id.clone(),
            })
            .await;
        assert!(
            matches!(&first, Ok(resp) if resp.is_success),
            "first claim should succeed, got {first:?}"
        );

        // Act: the SAME action is processed again (lost-response retry / re-call).
        // Executor skips already-Success transactions, so no tokens move — the
        // link must not be committed a second time.
        let retry: Result<ProcessActionResponseV3, CanisterError> = receiver_fixture
            .process_action_v3(ProcessActionInputV3 {
                action_id: action.action.id.clone(),
            })
            .await;

        // Assert: retry is an idempotent Ok, not a second commit.
        assert!(
            matches!(&retry, Ok(resp) if resp.is_success),
            "retry of a processed action should be an idempotent Ok, got {retry:?}"
        );

        let link = receiver_fixture
            .get_link_details_v3(&link_id, None)
            .await
            .unwrap()
            .link;
        assert_eq!(
            link.use_count, 1,
            "retry must not consume a second use (phantom claim)"
        );
        assert_eq!(link.link_state, LinkStateShared::Active);
        assert_eq!(
            link.asset_info[0].available_amount,
            initial_available_amount
                .map(|available| available - (airdrop_amount.clone() + icp_fee.clone())),
            "retry must not deduct available_amount a second time"
        );

        // Receiver got paid exactly once.
        let balance = icp_ledger_client
            .balance_of(&Account {
                owner: receiver,
                subaccount: None,
            })
            .await
            .unwrap();
        assert_eq!(
            balance, airdrop_amount,
            "receiver must be paid exactly once"
        );

        Ok(())
    })
    .await
    .unwrap();
}
