use std::collections::HashMap;

use crate::repositories;

pub struct ActionResp {
    pub action: cashier_types::Action,
    pub intents: Vec<cashier_types::Intent>,
    pub intent_txs: HashMap<String, Vec<cashier_types::Transaction>>,
}

pub fn get(action_id: String) -> Option<ActionResp> {
    let action = repositories::action::get(action_id.clone());

    if action.is_none() {
        return None;
    }

    let action_intents = repositories::action_intent::get_by_action_id(action_id.clone());

    let intent_ids = action_intents
        .iter()
        .map(|action_intent| action_intent.intent_id.clone())
        .collect();

    let intents = repositories::intent::batch_get(intent_ids);

    let mut transactions_hashmap = HashMap::new();

    for intent in &intents {
        let intent_transactions =
            repositories::intent_transaction::get_by_intent_id(intent.id.clone());

        let transaction_ids = intent_transactions
            .iter()
            .map(|intent_transaction| intent_transaction.transaction_id.clone())
            .collect();

        let transactions = repositories::transaction::batch_get(transaction_ids);

        transactions_hashmap.insert(intent.id.clone(), transactions);
    }

    return Some(ActionResp {
        action: action.unwrap(),
        intents,
        intent_txs: transactions_hashmap,
    });
}

pub mod flatten_tx_hashmap;
pub mod get_action_by_tx_id;
pub mod roll_up_state;
