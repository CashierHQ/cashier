pub mod create_action;

mod tests {
    use std::collections::HashMap;

    use cashier_types::{ActionState, IntentState, TransactionState};
    use faux::when;
    use ic_cdk_timers::TimerId;
    use icrc_ledger_types::icrc1::account::Account;
    use uuid::Uuid;

    use crate::{
        services::{
            __tests__::tests::{
                convert_tx_to_dummy_icrc_112_request, convert_txs_to_dummy_icrc_112_request,
                create_dummy_action, create_dummy_intent, create_dummy_tx_protocol,
                generate_random_principal, MockIcEnvironment,
            },
            transaction_manager::{
                action::ActionService, execute_transaction::ExecuteTransactionService,
                manual_check_status::ManualCheckStatusService, transaction::TransactionService,
                TransactionManagerService, UpdateActionArgs,
            },
        },
        types::{error::CanisterError, transaction_manager::ActionResp},
    };

    #[tokio::test]
    async fn should_update_action_with_all_crated_tx_success() {
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let mut transaction_service: TransactionService<MockIcEnvironment> =
            TransactionService::faux();
        let mut manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let mut action = create_dummy_action(cashier_types::ActionState::Created);
        let mut intent1 = create_dummy_intent(cashier_types::IntentState::Created);
        let mut intent2 = create_dummy_intent(cashier_types::IntentState::Created);
        let mut tx1 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx2 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");

        let creator = Account {
            owner: generate_random_principal(),
            subaccount: None,
        };
        action.creator = creator.owner.to_text();

        let mut intent_txs = HashMap::new();
        intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
        intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

        let action_resp = ActionResp {
            action: action.clone(),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };
        let link_id = Uuid::new_v4();

        let args = UpdateActionArgs {
            action_id: action.id.clone(),
            link_id: link_id.to_string(),
            execute_wallet_tx: true,
        };

        when!(ic_env.caller).then_return(creator.owner.clone());
        when!(action_service.get)
            .times(3)
            .then_return(Ok(action_resp.clone()));

        when!(action_service.flatten_tx_hashmap)
            .times(2)
            .then_return(vec![tx1.clone(), tx2.clone()]);

        when!(manual_check_status_service.execute(tx1.clone()))
            .times(1)
            .then_return(Ok(TransactionState::Created));
        when!(manual_check_status_service.execute(tx2.clone()))
            .times(1)
            .then_return(Ok(TransactionState::Created));

        when!(transaction_service.get_tx_by_id(tx1.id.clone())).then_return(Ok(tx1.clone()));
        when!(transaction_service.get_tx_by_id(tx2.id.clone())).then_return(Ok(tx2.clone()));
        when!(action_service.get_action_by_tx_id).then_return(Ok(action_resp.clone()));

        when!(transaction_service.create_icrc_112)
            .times(1)
            .then_return(Some(convert_txs_to_dummy_icrc_112_request(vec![
                tx1.clone(),
                tx2.clone(),
            ])));
        when!(ic_env.set_timer)
            .times(2)
            .then_return(TimerId::default());
        when!(transaction_service.update_tx_state)
            .times(2)
            .then_return(Ok(()));

        action.state = ActionState::Processing;
        intent1.state = IntentState::Processing;
        intent2.state = IntentState::Processing;
        tx1.state = TransactionState::Processing;
        tx2.state = TransactionState::Processing;

        let mut new_intent_txs = HashMap::new();
        new_intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
        new_intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

        let action_resp_updated = ActionResp {
            action: action.clone(),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs: new_intent_txs,
        };

        when!(action_service.get).then_return(Ok(action_resp_updated.clone()));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let action_dto = transaction_manager_service
            .update_action(args)
            .await
            .unwrap();

        assert_eq!(action_dto.id, action.id);
        assert_eq!(action_dto.creator, creator.owner.to_string());
        assert_eq!(action_dto.state, ActionState::Processing.to_string());
        assert_eq!(action_dto.intents.len(), 2);
        assert_eq!(
            action_dto.intents[0].state,
            IntentState::Processing.to_string()
        );
        assert_eq!(
            action_dto.intents[1].state,
            IntentState::Processing.to_string()
        );
        assert!(action_dto.icrc_112_requests.is_some());
        let requests = action_dto.icrc_112_requests.unwrap().clone();
        assert_eq!(requests.len(), 2);
        assert_eq!(requests[0][0].nonce, Some(tx1.id.clone()));
        assert_eq!(requests[1][0].nonce, Some(tx2.id.clone()));
    }

    #[tokio::test]
    async fn should_update_action_with_all_tip_link_tx_success() {
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let mut transaction_service: TransactionService<MockIcEnvironment> =
            TransactionService::faux();
        let mut manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let mut action = create_dummy_action(cashier_types::ActionState::Created);
        let mut intent1 = create_dummy_intent(cashier_types::IntentState::Created);
        let mut intent2 = create_dummy_intent(cashier_types::IntentState::Created);
        let mut tx1 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx2 = create_dummy_tx_protocol(TransactionState::Created, "icrc2_approve");
        let mut tx3 = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");

        tx1.group = 1;
        tx2.group = 1;
        tx3.group = 1;

        let creator = Account {
            owner: generate_random_principal(),
            subaccount: None,
        };
        action.creator = creator.owner.to_text();

        let mut intent_txs = HashMap::new();
        intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
        intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

        let action_resp = ActionResp {
            action: action.clone(),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };
        let link_id = Uuid::new_v4();

        let args = UpdateActionArgs {
            action_id: action.id.clone(),
            link_id: link_id.to_string(),
            execute_wallet_tx: true,
        };

        when!(ic_env.caller).then_return(creator.owner.clone());

        when!(action_service.get)
            .times(3)
            .then_return(Ok(action_resp.clone()));

        when!(action_service.flatten_tx_hashmap)
            .times(2)
            .then_return(vec![tx1.clone(), tx2.clone()]);

        when!(manual_check_status_service.execute(tx1.clone()))
            .times(1)
            .then_return(Ok(TransactionState::Created));
        when!(manual_check_status_service.execute(tx2.clone()))
            .times(1)
            .then_return(Ok(TransactionState::Created));

        when!(transaction_service.get_tx_by_id(tx1.id.clone())).then_return(Ok(tx1.clone()));
        when!(transaction_service.get_tx_by_id(tx2.id.clone())).then_return(Ok(tx2.clone()));
        when!(action_service.get_action_by_tx_id).then_return(Ok(action_resp.clone()));

        when!(transaction_service.create_icrc_112)
            .times(1)
            .then_return(Some(vec![
                vec![
                    convert_tx_to_dummy_icrc_112_request(&tx1.clone()),
                    convert_tx_to_dummy_icrc_112_request(&tx2.clone()),
                ],
                vec![convert_tx_to_dummy_icrc_112_request(&tx3.clone())],
            ]));
        when!(ic_env.set_timer)
            .times(2)
            .then_return(TimerId::default());
        when!(transaction_service.update_tx_state)
            .times(2)
            .then_return(Ok(()));

        action.state = ActionState::Processing;
        intent1.state = IntentState::Processing;
        intent2.state = IntentState::Processing;
        tx1.state = TransactionState::Processing;
        tx2.state = TransactionState::Processing;

        let mut new_intent_txs = HashMap::new();
        new_intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
        new_intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

        let action_resp_updated = ActionResp {
            action: action.clone(),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs: new_intent_txs,
        };

        when!(action_service.get).then_return(Ok(action_resp_updated.clone()));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let action_dto = transaction_manager_service
            .update_action(args)
            .await
            .unwrap();

        assert_eq!(action_dto.id, action.id);
        assert_eq!(action_dto.creator, creator.owner.to_string());
        assert_eq!(action_dto.state, ActionState::Processing.to_string());
        assert_eq!(action_dto.intents.len(), 2);
        assert_eq!(
            action_dto.intents[0].state,
            IntentState::Processing.to_string()
        );
        assert_eq!(
            action_dto.intents[1].state,
            IntentState::Processing.to_string()
        );
        assert!(action_dto.icrc_112_requests.is_some());
        let requests = action_dto.icrc_112_requests.unwrap().clone();

        println!("{:?}", requests);
        assert_eq!(requests.len(), 2);
        assert_eq!(requests[0][0].nonce, Some(tx1.id.clone()));
        assert_eq!(requests[0][1].nonce, Some(tx2.id.clone()));
        assert_eq!(requests[1][0].nonce, Some(tx3.id.clone()));
    }

    #[tokio::test]
    async fn should_not_update_tx_if_tx_is_processing_or_success() {
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let mut transaction_service: TransactionService<MockIcEnvironment> =
            TransactionService::faux();
        let mut manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let mut action = create_dummy_action(cashier_types::ActionState::Processing);
        let intent1 = create_dummy_intent(cashier_types::IntentState::Processing);
        let intent2 = create_dummy_intent(cashier_types::IntentState::Success);
        let tx1 = create_dummy_tx_protocol(TransactionState::Processing, "icrc1_transfer");
        let tx2 = create_dummy_tx_protocol(TransactionState::Success, "icrc1_transfer");

        let creator = Account {
            owner: generate_random_principal(),
            subaccount: None,
        };
        action.creator = creator.owner.to_text();

        let mut intent_txs = HashMap::new();
        intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
        intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

        let action_resp = ActionResp {
            action: action.clone(),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };
        let link_id = Uuid::new_v4();

        let args = UpdateActionArgs {
            action_id: action.id.clone(),
            link_id: link_id.to_string(),
            execute_wallet_tx: true,
        };

        when!(ic_env.caller).then_return(creator.owner.clone());
        when!(manual_check_status_service.execute(tx1.clone()))
            .times(1)
            .then_return(Ok(TransactionState::Processing));
        when!(manual_check_status_service.execute(tx2.clone()))
            .times(1)
            .then_return(Ok(TransactionState::Success));
        when!(action_service.get)
            .times(3)
            .then_return(Ok(action_resp.clone()));

        when!(action_service.flatten_tx_hashmap)
            .times(2)
            .then_return(vec![tx1.clone(), tx2.clone()]);
        when!(transaction_service.get_tx_by_id(tx1.id.clone())).then_return(Ok(tx1.clone()));
        when!(transaction_service.get_tx_by_id(tx2.id.clone())).then_return(Ok(tx2.clone()));
        when!(action_service.get_action_by_tx_id).then_return(Ok(action_resp.clone()));

        when!(transaction_service.create_icrc_112)
            .times(1)
            .then_return(None);
        when!(ic_env.set_timer)
            .times(2)
            .then_return(TimerId::default());

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let action_dto = transaction_manager_service
            .update_action(args)
            .await
            .unwrap();

        assert_eq!(action_dto.id, action.id);
        assert_eq!(action_dto.creator, creator.owner.to_string());
        assert_eq!(action_dto.state, ActionState::Processing.to_string());
        assert_eq!(action_dto.intents.len(), 2);
        assert_eq!(
            action_dto.intents[0].state,
            IntentState::Processing.to_string()
        );
        assert_eq!(
            action_dto.intents[1].state,
            IntentState::Success.to_string()
        );
        assert!(action_dto.icrc_112_requests.is_none());
    }

    #[tokio::test]
    async fn test_error_handling_action_not_found() {
        let mut action_service = ActionService::faux();
        let ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let transaction_service: TransactionService<MockIcEnvironment> = TransactionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let args = UpdateActionArgs {
            action_id: "invalid_action_id".to_string(),
            link_id: Uuid::new_v4().to_string(),
            execute_wallet_tx: true,
        };

        when!(action_service.get).then_return(Err("action not found".to_string()));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.update_action(args).await;
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[tokio::test]
    async fn test_error_handling_invalid_data() {
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let transaction_service: TransactionService<MockIcEnvironment> = TransactionService::faux();
        let mut manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let mut action = create_dummy_action(cashier_types::ActionState::Created);
        let mut intent = create_dummy_intent(cashier_types::IntentState::Created);
        let mut tx = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");

        let creator = Account {
            owner: generate_random_principal(),
            subaccount: None,
        };
        action.creator = creator.owner.to_text();

        let mut intent_txs = HashMap::new();
        intent_txs.insert(intent.id.clone(), vec![tx.clone()]);

        let action_resp = ActionResp {
            action: action.clone(),
            intents: vec![intent.clone()],
            intent_txs,
        };
        let link_id = Uuid::new_v4();

        let args = UpdateActionArgs {
            action_id: action.id.clone(),
            link_id: link_id.to_string(),
            execute_wallet_tx: true,
        };

        when!(ic_env.caller).then_return(creator.owner.clone());
        when!(action_service.get).then_return(Ok(action_resp.clone()));

        when!(action_service.flatten_tx_hashmap).then_return(vec![tx.clone()]);

        when!(manual_check_status_service.execute(tx.clone())).then_return(Err(
            CanisterError::InvalidDataError("Invalid data".to_string()),
        ));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.update_action(args).await;
        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
    }
}
