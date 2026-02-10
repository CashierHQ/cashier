// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v2::send_tip::fixture::create_tip_linkv2_fixture;
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::Nat;
use cashier_backend_types::constant::CKBTC_ICRC_TOKEN;
use cashier_backend_types::repository::action::v1::ActionState;
use cashier_backend_types::repository::intent::v1::IntentState;
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::transaction::v1::TransactionState;
use icrc_ledger_types::icrc1::account::Account;

/// Test scenario: Approve FAILED because tokens were drained before executing ICRC-112.
///
/// Flow:
/// 1. Create ckBTC tip link → get ICRC-112 (approve requests)
/// 2. Airdrop tokens to user
/// 3. Drain ALL tokens from user's wallet
/// 4. Execute ICRC-112 → approve calls fail (InsufficientFunds - can't pay approve fee)
/// 5. Activate link → transfer_from fails (InsufficientAllowance - no allowance was set)
///
/// Expected:
/// - All transactions: Fail
/// - All intents: Fail
/// - Action: Fail
/// - ICRC-112 returned for retry with approve requests
#[tokio::test]
async fn it_should_fail_activate_icrc_link_when_approve_fails_due_to_insufficient_funds() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, caller, token, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap();

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let dump_account = Account {
            owner: TestUser::User2.get_principal(),
            subaccount: None,
        };

        // Drain ALL tokens from user's wallet before executing ICRC-112
        let icp_balance = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_balance = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        icp_ledger_client
            .transfer(dump_account, icp_balance - icp_fee.clone())
            .await
            .unwrap();
        ckbtc_ledger_client
            .transfer(dump_account, ckbtc_balance - ckbtc_fee.clone())
            .await
            .unwrap();

        // Verify user wallet is drained
        let icp_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_after = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(icp_after, Nat::from(0u64), "ICP should be drained");
        assert_eq!(ckbtc_after, Nat::from(0u64), "ckBTC should be drained");

        // Act: Execute ICRC-112 requests → approve calls should fail (InsufficientFunds)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_result = execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: ICRC-112 execution returned Ok but parsed responses are errors (approve failed)
        assert!(icrc112_result.is_ok());
        let responses = icrc112_result.unwrap();
        for group in &responses {
            for resp in group {
                assert!(
                    resp.parsed_res.is_err(),
                    "Approve should fail due to insufficient funds: {:?}",
                    resp.parsed_res
                );
                let err_msg = resp.parsed_res.as_ref().unwrap_err();
                assert!(
                    err_msg.to_lowercase().contains("enough funds")
                        || err_msg.to_lowercase().contains("insufficient"),
                    "Error should indicate insufficient funds, got: {}",
                    err_msg
                );
            }
        }

        // Act: Activate the link (process action)
        let action_id = create_link_result.action.id.clone();
        let activate_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activation fails
        assert!(activate_result.is_ok());
        let result = activate_result.unwrap();
        assert!(!result.is_success, "Activation should fail");

        // Assert: Error should indicate InsufficientAllowance (no approval was set)
        let error_message = result.errors.join(", ");
        assert!(
            error_message.contains("InsufficientAllowance"),
            "Error should be InsufficientAllowance since approve failed, got: {}",
            error_message
        );

        // Assert: Link state should remain CreateLink
        assert_eq!(
            result.link.state,
            LinkState::CreateLink,
            "Link state should remain CreateLink"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert: All intents and transactions should be Fail
        for intent in &result.action.intents {
            assert_eq!(
                intent.state,
                IntentState::Fail,
                "Intent {:?} state should be Fail",
                intent.task
            );
            for tx in &intent.transactions {
                assert_eq!(
                    tx.state,
                    TransactionState::Fail,
                    "Transaction state should be Fail"
                );
            }
        }

        // Assert: ICRC-112 requests returned for retry (approve requests only)
        assert!(result.action.icrc_112_requests.is_some());
        let retry_icrc112 = result.action.icrc_112_requests.unwrap();
        assert_eq!(retry_icrc112.len(), 1);
        let retry_requests = &retry_icrc112[0];
        assert_eq!(
            retry_requests.len(),
            2,
            "Should have 2 approve retry requests (ICP + ckBTC)"
        );
        for req in retry_requests {
            assert_eq!(
                req.method, "icrc2_approve",
                "Retry request should be icrc2_approve"
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

/// Test scenario: Approve SUCCEEDED but transfer_from FAILED because tokens were drained
/// after approval but before process action.
///
/// Flow:
/// 1. Create ckBTC tip link → get ICRC-112 (approve requests)
/// 2. Airdrop tokens to user
/// 3. Execute ICRC-112 → approvals succeed
/// 4. Drain ALL tokens from user's wallet
/// 5. Activate link → transfer_from fails (InsufficientFunds)
/// 6. ICRC-112 returned for retry with same approve requests
/// 7. Execute retry ICRC-112 → deduplication error (same approve already executed)
///
/// Expected:
/// - transfer_from: Fail (InsufficientFunds)
/// - approve: Fail (rolled up from dependent transfer_from)
/// - All intents: Fail
/// - Action: Fail
/// - Retry ICRC-112 with approve requests → deduplication on re-execution
#[tokio::test]
async fn it_should_fail_activate_icrc_link_when_transfer_fails_and_retry_returns_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, caller, token, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap();

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let dump_account = Account {
            owner: TestUser::User2.get_principal(),
            subaccount: None,
        };

        // Act: Execute ICRC-112 requests → approvals succeed
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_result = execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: Approvals succeeded
        assert!(icrc112_result.is_ok());
        let responses = icrc112_result.unwrap();
        for group in &responses {
            for resp in group {
                assert!(
                    resp.parsed_res.is_ok(),
                    "Approve should succeed: {:?}",
                    resp.parsed_res
                );
            }
        }

        // Drain ALL tokens from user's wallet AFTER approval but BEFORE process action
        let icp_balance = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_balance = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        icp_ledger_client
            .transfer(dump_account, icp_balance - icp_fee.clone())
            .await
            .unwrap();
        ckbtc_ledger_client
            .transfer(dump_account, ckbtc_balance - ckbtc_fee.clone())
            .await
            .unwrap();

        // Verify user wallet is drained
        let icp_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_after = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(icp_after, Nat::from(0u64), "ICP should be drained");
        assert_eq!(ckbtc_after, Nat::from(0u64), "ckBTC should be drained");

        // Act: Activate the link (process action) → transfer_from fails
        let action_id = create_link_result.action.id.clone();
        let activate_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activation fails
        assert!(activate_result.is_ok());
        let result = activate_result.unwrap();
        assert!(!result.is_success, "Activation should fail");

        // Assert: Error should indicate InsufficientFunds (not InsufficientAllowance)
        let error_message = result.errors.join(", ");
        assert!(
            error_message.contains("InsufficientFunds"),
            "Error should be InsufficientFunds (allowance was set but no balance), got: {}",
            error_message
        );

        // Assert: Link state should remain CreateLink
        assert_eq!(
            result.link.state,
            LinkState::CreateLink,
            "Link state should remain CreateLink"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            result.action.state,
            ActionState::Fail,
            "Action state should be Fail"
        );

        // Assert: All intents and transactions should be Fail
        // (approve is rolled up to Fail because its dependent transfer_from failed)
        for intent in &result.action.intents {
            assert_eq!(
                intent.state,
                IntentState::Fail,
                "Intent {:?} state should be Fail",
                intent.task
            );
            for tx in &intent.transactions {
                assert_eq!(
                    tx.state,
                    TransactionState::Fail,
                    "Transaction state should be Fail"
                );
            }
        }

        // Assert: ICRC-112 requests returned for retry (approve requests only)
        assert!(result.action.icrc_112_requests.is_some());
        let retry_icrc112 = result.action.icrc_112_requests.unwrap();
        assert_eq!(retry_icrc112.len(), 1);
        let retry_requests = &retry_icrc112[0];
        assert_eq!(
            retry_requests.len(),
            2,
            "Should have 2 approve retry requests (ICP + ckBTC)"
        );
        for req in retry_requests {
            assert_eq!(
                req.method, "icrc2_approve",
                "Retry request should be icrc2_approve"
            );
        }

        // Act: Execute retry ICRC-112 → should get deduplication error
        // (same approve with same memo+created_at_time was already executed successfully)
        let retry_icrc112_result = execute_icrc112_request(&retry_icrc112, caller, ctx).await;

        // Assert: Retry execution returns deduplication error
        assert!(retry_icrc112_result.is_ok());
        for group in retry_icrc112_result.unwrap() {
            for resp in group {
                match resp.parsed_res {
                    Err(err) => {
                        let s = format!("{:?}", err).to_lowercase();
                        assert!(
                            s.contains(
                                "transaction is a duplicate of another transaction in block"
                            ),
                            "Expected deduplication error, got: {}",
                            s
                        );
                    }
                    Ok(_) => {
                        panic!("Expected deduplication error, got success");
                    }
                }
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}
