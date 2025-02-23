#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use cashier_types::{ActionState, IntentState, TransactionState};
    use faux::when;

    use crate::{
        services::transaction_manager::{
            action::ActionService,
            manual_check_status::ManualCheckStatusService,
            transaction::TransactionService,
            TransactionManagerService,
            __tests__::tests::{
                create_dummy_action, create_dummy_intent, create_dummy_transaction,
                MockIcEnvironment,
            },
        },
        types::{error::CanisterError, transaction_manager::ActionResp},
    };

    //TS1: Should return fail if there is no dependency
    #[tokio::test]
    async fn should_return_false_when_no_dependency() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let action = create_dummy_action(ActionState::Processing);
        let intent1 = create_dummy_intent(IntentState::Processing);
        let intent2 = create_dummy_intent(IntentState::Processing);
        let mut tx1 = create_dummy_transaction(TransactionState::Processing);
        let mut tx2 = create_dummy_transaction(TransactionState::Processing);

        let mut intent_txs = HashMap::new();
        let ic_env = MockIcEnvironment::faux();

        tx1.dependency = None;
        tx1.group = Some("1".to_string());
        tx2.dependency = Some(vec![]);
        tx2.group = Some("2".to_string());

        intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
        intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

        when!(transaction_service.get_tx_by_id(tx1.id.clone()))
            .once()
            .then_return(Ok(tx1.clone()));

        when!(action_service.get_action_by_tx_id(tx1.id.clone()))
            .once()
            .then_return(Ok(ActionResp {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        when!(transaction_service.get_tx_by_id(tx2.id.clone()))
            .once()
            .then_return(Ok(tx2.clone()));
        when!(action_service.get_action_by_tx_id(tx2.id.clone()))
            .once()
            .then_return(Ok(ActionResp {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
            );

        let result = transaction_manager_service.has_dependency(tx1.id);
        let result2 = transaction_manager_service.has_dependency(tx2.id);

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
        assert!(result2.is_ok());
        assert_eq!(result2.unwrap(), false);
    }

    //TS2:  Should return true if any dependencies is not success
    #[tokio::test]
    async fn should_return_true_when_depedencies_not_success() {
        let mut transaction_service = TransactionService::faux();
        let mut action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();

        let ic_env = MockIcEnvironment::faux();

        let action = create_dummy_action(ActionState::Processing);
        let intent1 = create_dummy_intent(IntentState::Processing);
        let intent2 = create_dummy_intent(IntentState::Processing);

        let mut tx_a = create_dummy_transaction(TransactionState::Processing);
        let tx_b = create_dummy_transaction(TransactionState::Processing);
        let tx_c = create_dummy_transaction(TransactionState::Fail);
        let tx_d = create_dummy_transaction(TransactionState::Success);

        let mut intent_txs = HashMap::new();

        tx_a.dependency = Some(vec![tx_b.id.clone(), tx_c.id.clone(), tx_d.id.clone()]);
        tx_a.group = Some("1".to_string());

        intent_txs.insert(
            intent1.id.clone(),
            vec![tx_b.clone(), tx_c.clone(), tx_d.clone()],
        );
        intent_txs.insert(intent2.id.clone(), vec![tx_a.clone()]);

        when!(transaction_service.get_tx_by_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.batch_get)
            .once()
            .then_return(Ok(vec![tx_b.clone(), tx_c.clone(), tx_d.clone()]));

        when!(action_service.get_action_by_tx_id(tx_a.id.clone()))
            .once()
            .then_return(Ok(ActionResp {
                action: action.clone(),
                intents: vec![intent1.clone(), intent2.clone()],
                intent_txs: intent_txs.clone(),
            }));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id);

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);
    }

    //TS: Should throw error if tx A depends on a transaction that does not exist (invalid dependency)
    #[tokio::test]
    async fn should_return_false_when_depedencies_success() {
        let mut transaction_service = TransactionService::faux();
        let action_service = ActionService::faux();
        let manual_check_status_service: ManualCheckStatusService<MockIcEnvironment> =
            ManualCheckStatusService::faux();
        let ic_env = MockIcEnvironment::faux();

        let mut tx_a = create_dummy_transaction(TransactionState::Processing);
        let tx_b = create_dummy_transaction(TransactionState::Processing);
        let tx_c = create_dummy_transaction(TransactionState::Processing);
        let tx_d = create_dummy_transaction(TransactionState::Processing);

        tx_a.dependency = Some(vec![tx_b.id.clone(), tx_c.id.clone(), tx_d.id.clone()]);

        when!(transaction_service.get_tx_by_id)
            .once()
            .then_return(Ok(tx_a.clone()));

        when!(transaction_service.batch_get)
            .once()
            .then_return(Err(CanisterError::NotFound(
                "Some transactions not found".to_string(),
            )));

        let transaction_manager_service: TransactionManagerService<MockIcEnvironment> =
            TransactionManagerService::new(
                transaction_service,
                action_service,
                manual_check_status_service,
                ic_env,
            );

        let result = transaction_manager_service.has_dependency(tx_a.id);

        assert!(result.is_err());
    }
}
