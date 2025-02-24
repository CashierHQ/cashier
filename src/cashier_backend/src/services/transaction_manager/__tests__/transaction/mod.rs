#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use cashier_types::TransactionState;
    use faux::when;

    use crate::{
        services::transaction_manager::{
            __tests__::{
                action::setup_repositories,
                tests::{create_dummy_action, create_dummy_intent, create_dummy_transaction},
            },
            action::ActionService,
            transaction::TransactionService,
        },
        types::transaction_manager::ActionResp,
    };

    // TS1: Update a single transaction to processing
    #[test]
    fn update_single_transaction_to_processing() {
        let (_, _, _, mut transaction_repository, _) = setup_repositories();

        let mut action_service = ActionService::faux();
        let mut tx = create_dummy_transaction(TransactionState::Created);

        let mut changed_tx = tx.clone();
        changed_tx.state = TransactionState::Processing;

        let intent1 = create_dummy_intent(cashier_types::IntentState::Created);
        let intent2 = create_dummy_intent(cashier_types::IntentState::Created);
        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![create_dummy_transaction(TransactionState::Created)],
        );
        intent_txs.insert(intent2.id.clone(), vec![changed_tx.clone()]);

        let action_resp = ActionResp {
            action: create_dummy_action(cashier_types::ActionState::Created),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };

        when!(transaction_repository.update).then_return(changed_tx);

        when!(action_service.roll_up_state).then_return(Ok(action_resp));

        let transaction_service = TransactionService::new(transaction_repository, action_service);

        let result = transaction_service.update_tx_state(&mut tx, TransactionState::Processing);

        assert!(result.is_ok());
        assert_eq!(tx.state, TransactionState::Processing);
    }

    // TS2: Update a single transaction to success
    #[test]
    fn update_single_transaction_to_success() {
        let (_, _, _, mut transaction_repository, _) = setup_repositories();

        let mut action_service = ActionService::faux();
        let mut tx = create_dummy_transaction(TransactionState::Processing);

        let mut changed_tx = tx.clone();
        changed_tx.state = TransactionState::Success;

        let intent1 = create_dummy_intent(cashier_types::IntentState::Processing);
        let intent2 = create_dummy_intent(cashier_types::IntentState::Success);
        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![create_dummy_transaction(TransactionState::Processing)],
        );
        intent_txs.insert(intent2.id.clone(), vec![changed_tx.clone()]);

        let action_resp = ActionResp {
            action: create_dummy_action(cashier_types::ActionState::Processing),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };

        when!(transaction_repository.update).then_return(changed_tx);

        when!(action_service.roll_up_state).then_return(Ok(action_resp));

        let transaction_service = TransactionService::new(transaction_repository, action_service);

        let result = transaction_service.update_tx_state(&mut tx, TransactionState::Success);

        assert!(result.is_ok());
        assert_eq!(tx.state, TransactionState::Success);
    }

    // TS3: Update a single transaction to fail
    #[test]
    fn update_single_transaction_to_failed() {
        let (_, _, _, mut transaction_repository, _) = setup_repositories();

        let mut action_service = ActionService::faux();
        let mut tx = create_dummy_transaction(TransactionState::Processing);

        let mut changed_tx = tx.clone();
        changed_tx.state = TransactionState::Fail;

        let intent1 = create_dummy_intent(cashier_types::IntentState::Fail);
        let intent2 = create_dummy_intent(cashier_types::IntentState::Success);
        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![create_dummy_transaction(TransactionState::Processing)],
        );
        intent_txs.insert(intent2.id.clone(), vec![changed_tx.clone()]);

        let action_resp = ActionResp {
            action: create_dummy_action(cashier_types::ActionState::Processing),
            intents: vec![intent1.clone(), intent2.clone()],
            intent_txs,
        };

        when!(transaction_repository.update).then_return(changed_tx);

        when!(action_service.roll_up_state).then_return(Ok(action_resp));

        let transaction_service = TransactionService::new(transaction_repository, action_service);

        let result = transaction_service.update_tx_state(&mut tx, TransactionState::Fail);

        assert!(result.is_ok());
        assert_eq!(tx.state, TransactionState::Fail);
    }
}
