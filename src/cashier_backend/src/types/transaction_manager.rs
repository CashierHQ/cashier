use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ActionData {
    pub action: cashier_types::Action,
    pub intents: Vec<cashier_types::Intent>,
    pub intent_txs: HashMap<String, Vec<cashier_types::Transaction>>,
}

impl ActionData {
    pub fn get_tx(&self, tx_id: &str) -> Result<&cashier_types::Transaction, String> {
        for (_intent_id, txs) in &self.intent_txs {
            for tx in txs {
                if tx.id == tx_id {
                    return Ok(tx);
                }
            }
        }

        Err(format!(
            "Transaction with id {} not found in intent_txs",
            tx_id
        ))
    }

    pub fn get_txs_of_tx_group(&self, tx_id: String) -> Result<Vec<String>, String> {
        let (group_index, id_index) = self.flatten_intent_txs();

        let group_key = id_index
            .get(&tx_id)
            .ok_or_else(|| format!("Transaction with id {} not found in intent_txs", tx_id))?;

        Ok(group_index.get(group_key).unwrap().to_vec())
    }

    pub fn flatten_intent_txs(&self) -> (HashMap<u16, Vec<String>>, HashMap<String, u16>) {
        let mut group_index: HashMap<u16, Vec<String>> = HashMap::new();
        let mut id_index: HashMap<String, u16> = HashMap::new();

        for (_intent_id, txs) in &self.intent_txs {
            for tx in txs {
                let group_key = tx.group.clone();
                group_index
                    .entry(group_key.clone())
                    .or_default()
                    .push(tx.id.clone());
                id_index.insert(tx.id.clone(), group_key);
            }
        }

        (group_index, id_index)
    }
}
