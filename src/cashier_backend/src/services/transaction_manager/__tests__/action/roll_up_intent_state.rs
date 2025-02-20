#[cfg(test)]
mod tests {
    use cashier_types::{Intent, IntentState, Transaction, TransactionState};
    use std::collections::HashMap;

    use crate::services::transaction_manager::action::ActionService;

    #[test]
    fn test_roll_up_all_created_tx() {
        let intent1 = Intent::create_dummy(IntentState::Created);
        let intent2 = Intent::create_dummy(IntentState::Created);

        let mut intents: Vec<Intent> = vec![intent1.clone(), intent2.clone()];

        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![
                Transaction::create_dummy(TransactionState::Created),
                Transaction::create_dummy(TransactionState::Created),
            ],
        );
        intent_txs.insert(
            intent2.id.clone(),
            vec![
                Transaction::create_dummy(TransactionState::Created),
                Transaction::create_dummy(TransactionState::Created),
            ],
        );

        let service = ActionService::new();
        service
            .roll_up_intent_state(&mut intents, &intent_txs)
            .unwrap();

        assert_eq!(intents[0].state, IntentState::Created);
        assert_eq!(intents[1].state, IntentState::Created);
    }

    #[test]
    fn test_roll_up_all_success_tx() {
        let intent1 = Intent::create_dummy(IntentState::Processing);
        let intent2 = Intent::create_dummy(IntentState::Processing);

        let mut intents: Vec<Intent> = vec![intent1.clone(), intent2.clone()];

        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![
                Transaction::create_dummy(TransactionState::Success),
                Transaction::create_dummy(TransactionState::Success),
            ],
        );
        intent_txs.insert(
            intent2.id.clone(),
            vec![
                Transaction::create_dummy(TransactionState::Success),
                Transaction::create_dummy(TransactionState::Success),
            ],
        );

        let service = ActionService::new();
        service
            .roll_up_intent_state(&mut intents, &intent_txs)
            .unwrap();

        assert_eq!(intents[0].state, IntentState::Success);
        assert_eq!(intents[1].state, IntentState::Success);
    }

    #[test]
    fn test_roll_up_any_fail_tx() {
        let intent1 = Intent::create_dummy(IntentState::Processing);
        let intent2 = Intent::create_dummy(IntentState::Processing);

        let mut intents: Vec<Intent> = vec![intent1.clone(), intent2.clone()];

        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![
                Transaction::create_dummy(TransactionState::Fail),
                Transaction::create_dummy(TransactionState::Success),
            ],
        );
        intent_txs.insert(
            intent2.id.clone(),
            vec![
                Transaction::create_dummy(TransactionState::Fail),
                Transaction::create_dummy(TransactionState::Success),
                Transaction::create_dummy(TransactionState::Processing),
                Transaction::create_dummy(TransactionState::Processing),
                Transaction::create_dummy(TransactionState::Success),
            ],
        );

        let service = ActionService::new();
        service
            .roll_up_intent_state(&mut intents, &intent_txs)
            .unwrap();

        assert_eq!(intents[0].state, IntentState::Fail);
        assert_eq!(intents[1].state, IntentState::Fail);
    }

    #[test]
    fn test_roll_up_processing_mixed() {
        let intent1 = Intent::create_dummy(IntentState::Processing);
        let intent2 = Intent::create_dummy(IntentState::Processing);

        let mut intents: Vec<Intent> = vec![intent1.clone(), intent2.clone()];

        let mut intent_txs = HashMap::new();
        intent_txs.insert(
            intent1.id.clone(),
            vec![
                Transaction::create_dummy(TransactionState::Success),
                Transaction::create_dummy(TransactionState::Processing),
            ],
        );
        intent_txs.insert(
            intent2.id.clone(),
            vec![
                Transaction::create_dummy(TransactionState::Success),
                Transaction::create_dummy(TransactionState::Processing),
                Transaction::create_dummy(TransactionState::Processing),
                Transaction::create_dummy(TransactionState::Processing),
                Transaction::create_dummy(TransactionState::Created),
            ],
        );

        let service = ActionService::new();
        service
            .roll_up_intent_state(&mut intents, &intent_txs)
            .unwrap();

        assert_eq!(intents[0].state, IntentState::Processing);
        assert_eq!(intents[1].state, IntentState::Processing);
    }
}
