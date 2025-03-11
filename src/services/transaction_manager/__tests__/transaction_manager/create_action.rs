mod tests {
    use std::collections::HashMap;

    use cashier_types::{ActionState, Intent, IntentState, Transaction, TransactionState};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        services::transaction_manager::{
            __tests__::tests::{
                create_dummy_intent, create_dummy_tx_protocol, generate_random_principal,
                MockIcEnvironment,
            },
            action::ActionService,
            transaction::TransactionService,
            validate::ValidateService,
            TransactionManagerService,
        },
        types::{error::CanisterError, temp_action::TemporaryAction},
    };

    #[tokio::test]
    async fn should_create_action_success() {
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let mut transaction_service: TransactionService<MockIcEnvironment> =
            TransactionService::faux();
        let validate_service = ValidateService::faux();

        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let creator = generate_random_principal().to_text();

        let mut intent1 = create_dummy_intent(IntentState::Created);
        let mut intent2 = create_dummy_intent(IntentState::Created);
        intent1.id = Uuid::new_v4().to_string();
        intent2.id = Uuid::new_v4().to_string();

        let mut tx1 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        let mut tx2 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
        tx1.id = Uuid::new_v4().to_string();
        tx2.id = Uuid::new_v4().to_string();

        let intents = vec![intent1.clone(), intent2.clone()];
        let mut intent_tx_hashmap: HashMap<String, Vec<Transaction>> = HashMap::new();
        intent_tx_hashmap.insert(intent1.id.clone(), vec![tx1.clone()]);
        intent_tx_hashmap.insert(intent2.id.clone(), vec![tx2.clone()]);

        let temp_action = TemporaryAction {
            id: action_id.clone(),
            r#type: "TRANSFER".to_string(),
            state: ActionState::Created,
            creator: creator.clone(),
            link_id: link_id.clone(),
            intents: intents.clone(),
        };

        when!(action_service.get_action_by_id).then_return(None);
        when!(transaction_service.batch_get).then_return(Ok(vec![]));
        when!(transaction_service.create_icrc_112).then_return(None);

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                validate_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.create_action(&temp_action);

        assert!(result.is_ok());

        let action_dto = result.unwrap();
        assert_eq!(action_dto.id, action_id);
        assert_eq!(action_dto.creator, creator);
        assert_eq!(action_dto.state, ActionState::Created.to_string());
        assert_eq!(action_dto.intents.len(), intents.len());
    }

    #[tokio::test]
    async fn should_return_error_if_action_already_exists() {
        let mut action_service = ActionService::faux();
        let ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let transaction_service: TransactionService<MockIcEnvironment> = TransactionService::faux();
        let validate_service = ValidateService::faux();

        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let creator = generate_random_principal().to_text();

        let mut intent1 = create_dummy_intent(IntentState::Created);
        let mut intent2 = create_dummy_intent(IntentState::Created);
        intent1.id = Uuid::new_v4().to_string();
        intent2.id = Uuid::new_v4().to_string();

        let intents = vec![intent1.clone(), intent2.clone()];

        let temp_action = TemporaryAction {
            id: action_id.clone(),
            r#type: "TRANSFER".to_string(),
            state: ActionState::Created,
            creator: creator.clone(),
            link_id: link_id.clone(),
            intents: intents.clone(),
        };

        when!(action_service.get_action_by_id).then_return(Some(temp_action.as_action()));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                validate_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.create_action(&temp_action);

        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }

    #[tokio::test]
    async fn should_return_error_if_dependency_not_found() {
        let mut action_service = ActionService::faux();
        let ic_env = MockIcEnvironment::faux();
        let execute_transaction_service = ExecuteTransactionService::faux();
        let transaction_service: TransactionService<MockIcEnvironment> = TransactionService::faux();
        let validate_service = ValidateService::faux();

        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let creator = generate_random_principal().to_text();

        let mut intent1 = create_dummy_intent(IntentState::Created);
        let mut intent2 = create_dummy_intent(IntentState::Created);
        intent1.id = Uuid::new_v4().to_string();
        intent2.id = Uuid::new_v4().to_string();
        intent1.dependency = vec![intent2.id.clone()];

        let intents = vec![intent1.clone(), intent2.clone()];

        let temp_action = TemporaryAction {
            id: action_id.clone(),
            r#type: "TRANSFER".to_string(),
            state: ActionState::Created,
            creator: creator.clone(),
            link_id: link_id.clone(),
            intents: intents.clone(),
        };

        when!(action_service.get_action_by_id).then_return(None);

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                validate_service,
                ic_env,
                execute_transaction_service,
            );

        let result = transaction_manager_service.create_action(&temp_action);

        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
    }
}
