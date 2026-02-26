// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v2::send_tip::fixture::create_tip_linkv2_fixture;
use crate::constant::CKBTC_ICRC_TOKEN;
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::Nat;
use cashier_backend_types::repository::{
    action::v1::ActionState,
    asset::v1::Asset,
    intent::v1::IntentState,
    link::v1::LinkState,
    transaction::v1::{IcTransaction, TransactionState},
};
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
        assert_eq!(icp_after, 0u64, "ICP should be drained");
        assert_eq!(ckbtc_after, 0u64, "ckBTC should be drained");

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

/// Test scenario: ckBTC approve SUCCEEDED but ICP fee approve FAILED because ICP was drained
/// before executing ICRC-112 (only ICP drained, ckBTC kept).
///
/// Flow:
/// 1. Create ckBTC tip link → get ICRC-112 (approve requests for ICP fee + ckBTC)
/// 2. Airdrop tokens to user
/// 3. Drain only ICP from user's wallet (keep ckBTC)
/// 4. Execute ICRC-112 → ckBTC approve succeeds, ICP approve fails (InsufficientFunds)
/// 5. Activate link → partial failure (ICP fee transfer_from fails, ckBTC transfer_from succeeds)
/// 6. Retry activation → Success transactions NOT re-executed, preserve Success state
///
/// Expected:
/// - Action: Fail (on first activation and retry until ICP is funded)
/// - Link state: CreateLink (unchanged)
/// - ICRC-112 returned for retry with only ICP request (ckBTC excluded - already succeeded)
/// - ckBTC approve transaction: Success (preserved on retry, not overwritten by rollup)
/// - ckBTC transfer_from: Success (not re-executed on retry)
#[tokio::test]
async fn it_should_fail_activate_icrc_link_when_icp_fee_approve_fails_but_token_approve_succeeds() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, caller, token, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap();

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let dump_account = Account {
            owner: TestUser::User2.get_principal(),
            subaccount: None,
        };

        // Drain only ICP from user's wallet (keep ckBTC)
        let icp_balance = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        icp_ledger_client
            .transfer(dump_account, icp_balance - icp_fee.clone())
            .await
            .unwrap();

        // Verify ICP is drained but ckBTC remains
        let icp_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(icp_after, 0u64, "ICP should be drained");

        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckbtc_after = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert!(ckbtc_after > 0u64, "ckBTC should remain");

        // Act: Execute ICRC-112 requests
        // ckBTC approve should succeed, ICP approve should fail (InsufficientFunds)
        let icrc_112_requests = create_link_result.action.icrc_112_requests.unwrap();
        let icrc112_result = execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        assert!(icrc112_result.is_ok());
        let responses = icrc112_result.unwrap();
        let icp_ledger_canister = ctx.icp_ledger_principal;
        let ckbtc_ledger_canister = ctx.get_icrc_token_principal(CKBTC_ICRC_TOKEN);

        for group in &responses {
            for resp in group {
                if resp.canister_id == icp_ledger_canister {
                    // ICP approve should fail
                    assert!(
                        resp.parsed_res.is_err(),
                        "ICP approve should fail: {:?}",
                        resp.parsed_res
                    );
                    let err_msg = resp.parsed_res.as_ref().unwrap_err();
                    assert!(
                        err_msg.to_lowercase().contains("enough funds")
                            || err_msg.to_lowercase().contains("insufficient"),
                        "ICP error should indicate insufficient funds, got: {}",
                        err_msg
                    );
                } else {
                    // ckBTC approve should succeed
                    assert!(
                        resp.parsed_res.is_ok(),
                        "ckBTC approve should succeed: {:?}",
                        resp.parsed_res
                    );
                }
            }
        }

        // Act: Activate the link (process action)
        let action_id = create_link_result.action.id.clone();
        let activate_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Activation fails
        assert!(activate_result.is_ok());
        let result = activate_result.unwrap();
        assert!(!result.is_success, "Activation should fail");

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

        // Assert: ICRC-112 requests returned for retry
        assert!(
            result.action.icrc_112_requests.is_some(),
            "Should return ICRC-112 retry requests"
        );
        let retry_icrc112 = result.action.icrc_112_requests.unwrap();
        assert_eq!(
            retry_icrc112.len(),
            1,
            "Should have 1 group of retry requests"
        );
        let retry_requests = &retry_icrc112[0];

        // Check which approve requests are in the retry
        let has_icp_approve = retry_requests
            .iter()
            .any(|req| req.canister_id == icp_ledger_canister && req.method == "icrc2_approve");
        let has_ckbtc_approve = retry_requests.iter().any(|req| {
            req.canister_id == ckbtc_ledger_canister.unwrap() && req.method == "icrc2_approve"
        });

        assert!(has_icp_approve, "Retry should contain ICP approve request");
        assert!(
            !has_ckbtc_approve,
            "Retry should NOT contain ckBTC approve request (already succeeded)"
        );

        // Act: Retry activation (process_action again without executing ICRC-112)
        // This simulates user retrying with empty balance after partial success
        let retry_activate_result = test_fixture.activate_link_v2(&action_id).await;

        // Assert: Retry activation still fails (ICP still has no balance)
        assert!(retry_activate_result.is_ok());
        let retry_result = retry_activate_result.unwrap();
        assert!(
            !retry_result.is_success,
            "Retry activation should still fail"
        );

        // Assert: Verify ckBTC approve transaction preserved SUCCESS state on retry
        let ckbtc_approve_tx = retry_result
            .action
            .intents
            .iter()
            .flat_map(|intent| &intent.transactions)
            .find(|tx| {
                if let Some(IcTransaction::Icrc2Approve(approve)) = tx.protocol.as_ic_transaction()
                {
                    let Asset::IC { address } = &approve.asset;
                    return address == &ckbtc_ledger_canister.unwrap();
                }
                false
            });

        assert!(
            ckbtc_approve_tx.is_some(),
            "ckBTC approve transaction should exist"
        );
        assert_eq!(
            ckbtc_approve_tx.unwrap().state,
            TransactionState::Success,
            "ckBTC approve should remain SUCCESS after retry (not re-validated)"
        );

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
/// 3. Execute ICRC-112 → approvals succeed on blockchain
/// 4. Drain ALL tokens from user's wallet (simulated via test hook)
/// 5. Activate link → validation queries blockchain, finds approve succeeded
///    → marks approve as Success, then transfer_from fails (InsufficientFunds)
/// 6. Rollup: Success approves preserved (not overwritten despite dependent failure)
/// 7. Retry: Success transactions excluded from ICRC-112 (no re-execution)
///
/// Expected after fix:
/// - approve: Success (validated on blockchain, preserved on retry)
/// - transfer_from: Fail (InsufficientFunds, not re-executed on retry)
/// - All intents: Fail
/// - Action: Fail
/// - Retry ICRC-112: empty (all approves succeeded, no retry needed for approves)
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
        assert_eq!(icp_after, 0u64, "ICP should be drained");
        assert_eq!(ckbtc_after, 0u64, "ckBTC should be drained");

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
