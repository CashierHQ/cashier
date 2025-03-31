mod tests {
    use cashier_types::{ActionState, ActionType, IntentState, TransactionState};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        services::{
            __tests__::{
                fixture::TransactionManagerTestFixture,
                tests::{
                    create_dummy_intent, create_dummy_transaction, generate_random_principal,
                    generate_timestamp,
                },
            },
            transaction_manager::TransactionManagerService,
        },
        types::temp_action::TemporaryAction,
    };

    #[tokio::test]
    async fn test_create_action_with_valid_input() {
        // Setup
        let (
            transaction_service,
            mut action_service,
            mut ic_env,
            icrc_service,
            mut ic_intent_adapter,
        ) = TransactionManagerTestFixture::setup();

        // Create a valid temporary action
        let action_id = Uuid::new_v4().to_string();
        let link_id = Uuid::new_v4().to_string();
        let creator = generate_random_principal().to_text();

        let intent1 = create_dummy_intent(IntentState::Created);
        let intent2 = create_dummy_intent(IntentState::Created);

        let temp_action = TemporaryAction {
            id: action_id.clone(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: creator.clone(),
            link_id: link_id.clone(),
            intents: vec![intent1.clone(), intent2.clone()],
            default_link_user_state: None,
        };

        // Mock action service to return None for get_action_by_id (action doesn't exist yet)
        when!(action_service.get_action_by_id).then_return(None);
        // Mock timestamp
        when!(ic_env.time).then_return(generate_timestamp());
        // Mock action service to return the created action

        // Mock intent adapter to return transactions
        let tx1 = create_dummy_transaction(TransactionState::Created);
        let tx2 = create_dummy_transaction(TransactionState::Created);

        let transactions = vec![tx1.clone(), tx2.clone()];

        when!(ic_intent_adapter.intent_to_transactions).then_return(Ok(transactions));
        when!(action_service.store_action_data).then_return(Ok(()));

        let tx_manager_service = TransactionManagerService::new(
            transaction_service,
            action_service,
            ic_env,
            icrc_service,
            ic_intent_adapter,
        );

        // Execute
        let result = tx_manager_service.create_action(&temp_action);

        // Verify
        assert!(result.is_ok());
        let action_dto = result.unwrap();
        assert_eq!(action_dto.id, action_id);
        assert_eq!(action_dto.state, ActionState::Created.to_string());
        // assert_eq!(action_dto.intents.len(), 2);
    }
}
