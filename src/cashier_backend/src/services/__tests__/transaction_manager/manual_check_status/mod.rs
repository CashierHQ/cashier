// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


#[cfg(test)]
mod tests {
    use candid::Nat;
    use cashier_types::{FromCallType, TransactionState};
    use faux::when;
    use ic_cdk::api::call::RejectionCode;
    use ic_cdk_timers::TimerId;

    use crate::{
        services::{
            __tests__::tests::{
                create_dummy_transaction, create_dummy_tx_protocol, generate_timestamp,
                MockIcEnvironment, ONE_HOUR_IN_NANOSECONDS, TX_TIMEOUT,
            },
            ext::icrc_token::Allowance,
            transaction_manager::{
                action::ActionService, execute_transaction::ExecuteTransactionService,
                manual_check_status::ManualCheckStatusService, transaction::TransactionService,
                TransactionManagerService,
            },
        },
        types::error::{CanisterError, DisplayRejectionCode},
        utils::icrc::IcrcService,
    };

    //TS1: Transaction Status is NOT processing
    #[tokio::test]
    async fn test_execute_transaction_not_processing() {
        let icrc_service = IcrcService::faux();
        let env = MockIcEnvironment::faux();
        let manual_check_service = ManualCheckStatusService::new(icrc_service, env);

        let tx1 = create_dummy_transaction(TransactionState::Created);
        let tx2 = create_dummy_transaction(TransactionState::Fail);
        let tx3 = create_dummy_transaction(TransactionState::Success);

        let result1 = manual_check_service.execute(&tx1, vec![]).await;
        let result2 = manual_check_service.execute(&tx2, vec![]).await;
        let result3 = manual_check_service.execute(&tx3, vec![]).await;

        assert!(result1.is_ok());
        assert!(result2.is_ok());
        assert!(result3.is_ok());
        assert_eq!(result1.unwrap(), TransactionState::Created);
        assert_eq!(result2.unwrap(), TransactionState::Fail);
        assert_eq!(result3.unwrap(), TransactionState::Success);
    }

    //TS3: ICRC1 Transfer with Correct Wallet Balance
    #[tokio::test]
    async fn should_success_execute_icrc_1_transfer_with_correct_wallet_balance() {
        let mut icrc_service = IcrcService::faux();
        let test_ts = generate_timestamp();
        let runtime_ts = test_ts + ONE_HOUR_IN_NANOSECONDS;
        let env = MockIcEnvironment::new_with_time(runtime_ts);

        let mut tx1 = create_dummy_tx_protocol(TransactionState::Processing, "icrc1_transfer");
        let icrc1_transfer_protocol = tx1
            .protocol
            .as_ic_transaction()
            .unwrap()
            .as_icrc1_transfer()
            .unwrap();
        tx1.created_at = test_ts;
        // start ts should be earlier than runtime_ts to trigger test
        let start_ts = runtime_ts - TX_TIMEOUT;
        tx1.start_ts = Some(start_ts);
        let to_wallet = icrc1_transfer_protocol.to.clone();
        let to_account = to_wallet.get_account().unwrap();
        let asset = icrc1_transfer_protocol.asset.get_principal().unwrap();
        when!(icrc_service.balance_of(asset, to_account))
            .once()
            .then_return(Ok(icrc1_transfer_protocol.amount));

        let manual_check_service = ManualCheckStatusService::new(icrc_service, env);
        let result = manual_check_service.execute(&tx1, vec![]).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), TransactionState::Success);
    }

    //TS4: ICRC1 Transfer with Insufficient Wallet Balance
    #[tokio::test]
    async fn should_fail_execute_icrc_1_transfer_with_insufficient_wallet_balance() {
        let mut icrc_service = IcrcService::faux();
        let create_ts = generate_timestamp();
        let runtime_ts = create_ts + ONE_HOUR_IN_NANOSECONDS;
        let env = MockIcEnvironment::new_with_time(runtime_ts);

        let mut tx1 = create_dummy_tx_protocol(TransactionState::Processing, "icrc1_transfer");
        let icrc1_transfer_protocol = tx1
            .protocol
            .as_ic_transaction()
            .unwrap()
            .as_icrc1_transfer()
            .unwrap();
        tx1.created_at = create_ts;
        let start_ts = runtime_ts - TX_TIMEOUT;
        tx1.start_ts = Some(start_ts);
        let to_wallet = icrc1_transfer_protocol.to.clone();
        let to_account = to_wallet.get_account().unwrap();
        let asset = icrc1_transfer_protocol.asset.get_principal().unwrap();
        when!(icrc_service.balance_of(asset, to_account))
            .once()
            .then_return(Ok(icrc1_transfer_protocol.amount - 1000));

        let manual_check_service = ManualCheckStatusService::new(icrc_service, env);
        let result = manual_check_service.execute(&tx1, vec![]).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), TransactionState::Fail);
    }

    //TS5: Canister check balance call rejected
    #[tokio::test]
    async fn should_fail_execute_if_balance_of_canister_call_rejected() {
        let mut icrc_service = IcrcService::faux();
        let create_ts = generate_timestamp();
        let runtime_ts = create_ts + ONE_HOUR_IN_NANOSECONDS;
        let env = MockIcEnvironment::new_with_time(runtime_ts);

        let mut tx1 = create_dummy_tx_protocol(TransactionState::Processing, "icrc1_transfer");
        let icrc1_transfer_protocol = tx1
            .protocol
            .as_ic_transaction()
            .unwrap()
            .as_icrc1_transfer()
            .unwrap();
        tx1.created_at = create_ts;
        let start_ts = runtime_ts - TX_TIMEOUT;
        tx1.start_ts = Some(start_ts);
        let to_wallet = icrc1_transfer_protocol.to.clone();
        let to_account = to_wallet.get_account().unwrap();
        let asset = icrc1_transfer_protocol.asset.get_principal().unwrap();

        when!(icrc_service.balance_of(asset, to_account))
            .once()
            .then_return(Err(CanisterError::CanisterCallRejectError(
                "icrc_1_balance_of".to_string(),
                "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                DisplayRejectionCode(RejectionCode::CanisterReject),
                "Failed to get balance".to_string(),
            )));

        let mut tx2 = create_dummy_tx_protocol(TransactionState::Processing, "icrc1_transfer");
        tx2.created_at = create_ts;
        let start_ts = runtime_ts - TX_TIMEOUT;
        tx2.start_ts = Some(start_ts);
        let icrc1_transfer_protocol_tx2 = tx2
            .protocol
            .as_ic_transaction()
            .unwrap()
            .as_icrc1_transfer()
            .unwrap();
        let to_account_2 = icrc1_transfer_protocol_tx2.to.get_account().unwrap();
        let asset2 = icrc1_transfer_protocol_tx2.asset.get_principal().unwrap();

        when!(icrc_service.balance_of(asset2, to_account_2))
            .once()
            .then_return(Err(CanisterError::UnknownError(
                "Failed to get balance".to_string(),
            )));

        let manual_check_service = ManualCheckStatusService::new(icrc_service, env);
        let result1 = manual_check_service.execute(&tx1, vec![]).await;
        let result2 = manual_check_service.execute(&tx2, vec![]).await;

        assert!(result1.is_ok());
        assert_eq!(result1.unwrap(), TransactionState::Fail);
        assert!(result2.is_ok());
        assert_eq!(result2.unwrap(), TransactionState::Fail);
    }

    //TS6: ICRC2 Approve with Correct Allowance
    #[tokio::test]
    async fn should_success_icrc2_approve_with_correct_allowance() {
        let mut icrc_service = IcrcService::faux();
        let create_ts = generate_timestamp();
        let runtime_ts = create_ts + ONE_HOUR_IN_NANOSECONDS;
        let env = MockIcEnvironment::new_with_time(runtime_ts);

        let mut tx1 = create_dummy_tx_protocol(TransactionState::Processing, "icrc2_approve");
        let icrc2_transfer_protocol = tx1
            .protocol
            .as_ic_transaction()
            .unwrap()
            .as_icrc2_approve()
            .unwrap();
        tx1.created_at = create_ts;
        let start_ts = runtime_ts - TX_TIMEOUT;
        tx1.start_ts = Some(start_ts);

        let owner_fund_account = icrc2_transfer_protocol.from.get_account().unwrap();
        let spender_fund_account = icrc2_transfer_protocol.spender.get_account().unwrap();

        let allowance_amount = icrc2_transfer_protocol.amount;

        let expected_allowance = Allowance {
            allowance: Nat::from(allowance_amount),
            expires_at: None,
        };

        let asset = icrc2_transfer_protocol.asset.get_principal().unwrap();

        when!(icrc_service.allowance(asset, owner_fund_account, spender_fund_account))
            .once()
            .then_return(Ok(expected_allowance));

        let manual_check_service = ManualCheckStatusService::new(icrc_service, env);
        let result = manual_check_service.execute(&tx1, vec![]).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), TransactionState::Success);
    }

    //TS7: ICRC2 Approve with Incorrect Allowance
    #[tokio::test]
    async fn should_fail_icrc2_approve_with_incorrect_allowance() {
        let mut icrc_service = IcrcService::faux();
        let create_ts = generate_timestamp();
        let runtime_ts = create_ts + ONE_HOUR_IN_NANOSECONDS;
        let env = MockIcEnvironment::new_with_time(runtime_ts);

        let mut tx1 = create_dummy_tx_protocol(TransactionState::Processing, "icrc2_approve");
        let icrc2_transfer_protocol = tx1
            .protocol
            .as_ic_transaction()
            .unwrap()
            .as_icrc2_approve()
            .unwrap();
        tx1.created_at = create_ts;
        let start_ts = runtime_ts - TX_TIMEOUT;
        tx1.start_ts = Some(start_ts);

        let owner_fund_account = icrc2_transfer_protocol.from.get_account().unwrap();
        let spender_fund_account = icrc2_transfer_protocol.spender.get_account().unwrap();

        let allowance_amount = icrc2_transfer_protocol.amount;

        let expected_allowance = Allowance {
            allowance: Nat::from(allowance_amount - 10000),
            expires_at: None,
        };

        let asset = icrc2_transfer_protocol.asset.get_principal().unwrap();

        when!(icrc_service.allowance(asset, owner_fund_account, spender_fund_account))
            .once()
            .then_return(Ok(expected_allowance));

        let manual_check_service = ManualCheckStatusService::new(icrc_service, env);
        let result = manual_check_service.execute(&tx1, vec![]).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), TransactionState::Fail);
    }

    //TS8: ICRC2 Approve with Canister Call Rejected
    #[tokio::test]
    async fn should_fail_icrc2_approve_with_error() {
        let mut icrc_service = IcrcService::faux();
        let create_ts = generate_timestamp();
        let runtime_ts = create_ts + ONE_HOUR_IN_NANOSECONDS;
        let env = MockIcEnvironment::new_with_time(runtime_ts);

        let mut tx1 = create_dummy_tx_protocol(TransactionState::Processing, "icrc2_approve");
        let icrc2_transfer_protocol = tx1
            .protocol
            .as_ic_transaction()
            .unwrap()
            .as_icrc2_approve()
            .unwrap();
        tx1.created_at = create_ts;
        let start_ts = runtime_ts - TX_TIMEOUT;
        tx1.start_ts = Some(start_ts);

        let owner_fund_account1: icrc_ledger_types::icrc1::account::Account =
            icrc2_transfer_protocol.from.get_account().unwrap();
        let spender_fund_account1 = icrc2_transfer_protocol.spender.get_account().unwrap();

        let mut tx2 = create_dummy_tx_protocol(TransactionState::Processing, "icrc2_approve");
        let icrc2_transfer_protocol2 = tx2
            .protocol
            .as_ic_transaction()
            .unwrap()
            .as_icrc2_approve()
            .unwrap();
        tx2.created_at = create_ts;
        let start_ts = runtime_ts - TX_TIMEOUT;
        tx2.start_ts = Some(start_ts);

        let owner_fund_account2 = icrc2_transfer_protocol2.from.get_account().unwrap();
        let spender_fund_account2 = icrc2_transfer_protocol2.spender.get_account().unwrap();

        let asset1 = icrc2_transfer_protocol.asset.get_principal().unwrap();
        let asset2 = icrc2_transfer_protocol2.asset.get_principal().unwrap();

        when!(icrc_service.allowance(asset1, owner_fund_account1, spender_fund_account1))
            .once()
            .then_return(Err(CanisterError::CanisterCallRejectError(
                "icrc_2_allowance".to_string(),
                "jjio5-5aaaa-aaaam-adhaq-cai".to_string(),
                DisplayRejectionCode(RejectionCode::CanisterReject),
                "Failed to get allowance".to_string(),
            )));

        when!(icrc_service.allowance(asset2, owner_fund_account2, spender_fund_account2))
            .once()
            .then_return(Err(CanisterError::UnknownError(
                "Failed to get allowance".to_string(),
            )));

        let manual_check_service = ManualCheckStatusService::new(icrc_service, env);
        let result1 = manual_check_service.execute(&tx1, vec![]).await;
        let result2 = manual_check_service.execute(&tx2, vec![]).await;

        assert!(result1.is_ok());
        assert_eq!(result1.unwrap(), TransactionState::Fail);
        assert!(result2.is_ok());
        assert_eq!(result2.unwrap(), TransactionState::Fail);
    }

    #[tokio::test]
    async fn should_execute_tx_success() {
        let mut transaction_service: TransactionService<_> = TransactionService::faux();
        let action_service = ActionService::faux();
        let manual_check_status_service = ManualCheckStatusService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();

        let mut tx = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        tx.from_call_type = FromCallType::Wallet;

        let tx_clone = Box::new(tx.clone());
        when!(ic_env.set_timer).then_return(TimerId::default());
        when!(transaction_service.update_tx_state(*tx_clone.clone(), TransactionState::Processing))
            .once()
            .then_return(Ok(()));

        let tx_manager = TransactionManagerService::new(
            transaction_service,
            action_service,
            manual_check_status_service,
            ic_env,
            execute_transaction_service,
        );

        let result = tx_manager.deprecate_execute_tx(&mut tx).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn should_execute_icrc2_transfer_from_success() {
        let mut transaction_service: TransactionService<_> = TransactionService::faux();
        let action_service = ActionService::faux();
        let manual_check_status_service = ManualCheckStatusService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let mut execute_transaction_service = ExecuteTransactionService::faux();

        let mut tx = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");
        tx.from_call_type = FromCallType::Canister;

        when!(ic_env.set_timer).then_return(TimerId::default());
        let tx_clone = Box::new(tx.clone());
        when!(transaction_service.update_tx_state(*tx_clone.clone(), TransactionState::Processing))
            .once()
            .then_return(Ok(()));
        when!(execute_transaction_service.execute(*tx_clone.clone())).then_return(Ok(()));
        when!(transaction_service.update_tx_state(*tx_clone.clone(), TransactionState::Success))
            .once()
            .then_return(Ok(()));

        let tx_manager = TransactionManagerService::new(
            transaction_service,
            action_service,
            manual_check_status_service,
            ic_env,
            execute_transaction_service,
        );

        let result = tx_manager.deprecate_execute_tx(&mut tx).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn should_execute_icrc2_transfer_from_fail() {
        let mut transaction_service: TransactionService<_> = TransactionService::faux();
        let action_service = ActionService::faux();
        let manual_check_status_service = ManualCheckStatusService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let mut execute_transaction_service = ExecuteTransactionService::faux();

        let mut tx = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");
        tx.from_call_type = FromCallType::Canister;

        when!(ic_env.set_timer).then_return(TimerId::default());
        let tx_clone = Box::new(tx.clone());
        when!(transaction_service.update_tx_state(*tx_clone.clone(), TransactionState::Processing))
            .once()
            .then_return(Ok(()));
        when!(execute_transaction_service.execute(*tx_clone.clone())).then_return(Ok(()));
        when!(transaction_service.update_tx_state(*tx_clone.clone(), TransactionState::Success))
            .once()
            .then_return(Ok(()));

        let tx_manager = TransactionManagerService::new(
            transaction_service,
            action_service,
            manual_check_status_service,
            ic_env,
            execute_transaction_service,
        );

        let result = tx_manager.deprecate_execute_tx(&mut tx).await;
        assert!(result.is_ok());
    }
}
