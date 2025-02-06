use std::collections::HashMap;

use crate::repositories;

pub struct ActionResp {
    pub action: cashier_types::Action,
    pub intents: Vec<cashier_types::Intent>,
    pub intent_txs: HashMap<String, Vec<cashier_types::Transaction>>,
}

pub fn get_action_by_tx_id(tx_id: String) -> Result<ActionResp, String> {
    let get_intent_tx_res = repositories::intent_transaction::get_by_transaction_id(tx_id);
    let intent_tx_belong = get_intent_tx_res
        .first()
        .ok_or("intent_transaction not found")?;
    let intent_id = intent_tx_belong.intent_id.clone();

    let get_action_intent_res = repositories::action_intent::get_by_intent_id(intent_id);

    let action_intent = get_action_intent_res
        .first()
        .ok_or("action_intent not found")?;

    let action_id = action_intent.action_id.clone();

    let action = repositories::action::get(action_id.clone()).ok_or_else(|| "action not found")?;

    let all_intents = repositories::action_intent::get_by_action_id(action_id);

    let intents = all_intents
        .iter()
        .map(|action_intent| {
            let intent = repositories::intent::get(action_intent.intent_id.clone()).unwrap();
            intent
        })
        .collect();

    let mut intent_txs = HashMap::new();

    for action_intent in all_intents {
        let intent_tx =
            repositories::intent_transaction::get_by_intent_id(action_intent.intent_id.clone());

        let mut txs = vec![];
        for intent_tx in intent_tx {
            let tx = repositories::transaction::get(&intent_tx.transaction_id.clone())
                .ok_or_else(|| "transaction not found")?;
            txs.push(tx);
        }

        intent_txs.insert(action_intent.intent_id, txs);
    }

    Ok(ActionResp {
        action,
        intents,
        intent_txs,
    })
}
