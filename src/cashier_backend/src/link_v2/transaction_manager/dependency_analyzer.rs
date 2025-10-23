use cashier_backend_types::{
    error::CanisterError,
    repository::{intent::v1::Intent, transaction::v1::Transaction},
};
use std::collections::HashMap;

pub fn analyze_and_fill_transaction_dependencies(
    intents: &Vec<Intent>,
    intent_txs_map: &HashMap<String, Vec<Transaction>>,
) -> Result<Vec<Transaction>, CanisterError> {
    let mut updated_transactions = Vec::<Transaction>::new();

    // build intent dependency map
    let mut intent_dependency_map = HashMap::<String, Vec<String>>::new();
    for intent in intents.iter() {
        intent_dependency_map.insert(intent.id.clone(), intent.dependency.clone());
    }

    // build transaction dependency map
    let mut tx_dependency_map = HashMap::<String, Vec<String>>::new();
    for (intent_id, txs) in intent_txs_map.iter() {
        let mut dependent_txs = Vec::<String>::new();
        if let Some(dependent_intents) = intent_dependency_map.get(intent_id) {
            for dep_intent_id in dependent_intents.iter() {
                if let Some(dep_txs) = intent_txs_map.get(dep_intent_id) {
                    for tx in dep_txs.iter() {
                        dependent_txs.extend(vec![tx.id.clone()]);
                    }
                }
            }
        }

        for tx in txs.iter() {
            tx_dependency_map
                .entry(tx.id.clone())
                .or_insert_with(Vec::new)
                .extend(dependent_txs.clone());
        }
    }

    // update transactions with dependencies
    for (_intent_id, txs) in intent_txs_map.iter() {
        for mut tx in txs.iter().cloned() {
            if let Some(dependencies) = tx_dependency_map.get(&tx.id) {
                tx.dependency = Some(dependencies.clone());
            }
            updated_transactions.push(tx);
        }
    }

    Ok(updated_transactions)
}
