// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v3::send_tip::fixture::create_tip_linkv3_fixture;
use crate::constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN};
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::Nat;
use cashier_common::constant::CREATE_LINK_FEE;
use icrc_ledger_types::icrc1::account::Account;
use std::time::Duration;

#[tokio::test]
async fn it_should_fail_reexecute_icrc112_icp_immediately_due_to_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let (_test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            icp_ledger_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };

        // Act: Execute ICRC-112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: ICRC-112 execution succeeded
        assert!(icrc112_execution_result.is_ok());
        let link_id = create_link_result.link.id.clone();
        let link_account = link_id_to_account(ctx, &link_id);
        let icp_link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let balance_after_first_execution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act: Re-execute the same ICRC-112 requests immediately
        let icrc112_reexecution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: Re-execution returns deduplication errors
        assert!(icrc112_reexecution_result.is_ok());
        for res in icrc112_reexecution_result.unwrap() {
            for call_response in res {
                match call_response.parsed_res {
                    Err(decode_err) => {
                        let s = format!("{:?}", decode_err).to_lowercase();
                        assert!(
                            s.contains(
                                "transaction is a duplicate of another transaction in block"
                            ),
                            "Expected deduplication error, got: {}",
                            s
                        );
                    }
                    Ok(_) => {
                        panic!(
                            "Expected deduplication error, got success: {:?}",
                            call_response.parsed_res
                        );
                    }
                }
            }
        }

        // Assert: Balances unchanged due to deduplication
        let balance_after_reexecution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            balance_after_reexecution, balance_after_first_execution,
            "Caller balance after re-execution should be unchanged due to deduplication"
        );

        let icp_link_balance_after_reexecution =
            icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            icp_link_balance_after_reexecution, icp_link_balance,
            "Link balance after re-execution should be unchanged due to deduplication"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_reexecute_icrc112_icp_after_1week_due_to_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let (_test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            icp_ledger_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };

        // Act: Execute ICRC-112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: ICRC-112 execution succeeded
        assert!(icrc112_execution_result.is_ok());
        let link_id = create_link_result.link.id.clone();
        let link_account = link_id_to_account(ctx, &link_id);
        let icp_link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let balance_after_first_execution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act: Re-execute the same ICRC-112 requests after 1 week
        ctx.advance_time(Duration::from_secs(7 * 24 * 3600 + 1))
            .await;
        let icrc112_reexecution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: Re-execution fails with "too far in the past" error
        assert!(icrc112_reexecution_result.is_ok());
        for res in icrc112_reexecution_result.unwrap() {
            for call_response in res {
                match call_response.parsed_res {
                    Err(decode_err) => {
                        let s = format!("{:?}", decode_err).to_lowercase();
                        assert!(
                            s.contains("transaction's created_at_time is too far in the past"),
                            "Expected 'too far in the past' error, got: {}",
                            s
                        );
                    }
                    Ok(_) => {
                        panic!(
                            "Expected an error, got success: {:?}",
                            call_response.parsed_res
                        );
                    }
                }
            }
        }

        // Assert: Balances unchanged
        let balance_after_reexecution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            balance_after_reexecution, balance_after_first_execution,
            "Caller balance after re-execution should be unchanged"
        );

        let icp_link_balance_after_reexecution =
            icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            icp_link_balance_after_reexecution, icp_link_balance,
            "Link balance after re-execution should be unchanged"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_reexecute_icrc112_icrc_immediately_due_to_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(token, caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap();
        let (_test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            ckbtc_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let initial_icp_caller_balance =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act: Execute ICRC-112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: ICRC-112 execution succeeded
        assert!(icrc112_execution_result.is_ok());

        let icp_caller_balance_after_first_execution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_caller_balance_after_first_execution = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        assert_eq!(
            icp_caller_balance_after_first_execution,
            initial_icp_caller_balance - Nat::from(CREATE_LINK_FEE),
            "ICP caller balance after first execution is incorrect"
        );

        // Act: Re-execute the same ICRC-112 requests immediately
        let icrc112_reexecution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: Re-execution returns deduplication errors
        assert!(icrc112_reexecution_result.is_ok());
        for res in icrc112_reexecution_result.unwrap() {
            for call_response in res {
                match call_response.parsed_res {
                    Err(decode_err) => {
                        let s = format!("{:?}", decode_err).to_lowercase();
                        assert!(
                            s.contains(
                                "transaction is a duplicate of another transaction in block"
                            ),
                            "Expected deduplication error, got: {}",
                            s
                        );
                    }
                    Ok(_) => {
                        panic!(
                            "Expected deduplication error, got success: {:?}",
                            call_response.parsed_res
                        );
                    }
                }
            }
        }

        // Assert: Balances unchanged due to deduplication
        let icp_caller_balance_after_reexecution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            icp_caller_balance_after_reexecution, icp_caller_balance_after_first_execution,
            "ICP caller balance after re-execution should be unchanged due to deduplication"
        );

        let ckbtc_caller_balance_after_reexecution = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_caller_balance_after_reexecution, ckbtc_caller_balance_after_first_execution,
            "ckBTC caller balance after re-execution should be unchanged due to deduplication"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_reexecute_icrc112_icrc_after_1week_due_to_deduplication() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(token, caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap();
        let (_test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            ckbtc_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let initial_icp_caller_balance =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act: Execute ICRC-112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result.icrc112_requests.unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: ICRC-112 execution succeeded
        assert!(icrc112_execution_result.is_ok());

        let icp_caller_balance_after_first_execution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_caller_balance_after_first_execution = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        assert_eq!(
            icp_caller_balance_after_first_execution,
            initial_icp_caller_balance - Nat::from(CREATE_LINK_FEE),
            "ICP caller balance after first execution is incorrect"
        );

        // Act: Re-execute the same ICRC-112 requests after 1 week
        ctx.advance_time(Duration::from_secs(7 * 24 * 3600 + 1))
            .await;
        let icrc112_reexecution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: Re-execution fails with "too far in the past" error
        assert!(icrc112_reexecution_result.is_ok());
        for res in icrc112_reexecution_result.unwrap() {
            for call_response in res {
                match call_response.parsed_res {
                    Err(decode_err) => {
                        let s = format!("{:?}", decode_err).to_lowercase();
                        assert!(
                            s.contains("transaction's created_at_time is too far in the past"),
                            "Expected 'too far in the past' error, got: {}",
                            s
                        );
                    }
                    Ok(_) => {
                        panic!(
                            "Expected an error, got success: {:?}",
                            call_response.parsed_res
                        );
                    }
                }
            }
        }

        // Assert: Balances unchanged
        let icp_caller_balance_after_reexecution =
            icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            icp_caller_balance_after_reexecution, icp_caller_balance_after_first_execution,
            "ICP caller balance after re-execution should be unchanged"
        );

        let ckbtc_caller_balance_after_reexecution = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(
            ckbtc_caller_balance_after_reexecution, ckbtc_caller_balance_after_first_execution,
            "ckBTC caller balance after re-execution should be unchanged"
        );

        Ok(())
    })
    .await
    .unwrap();
}
