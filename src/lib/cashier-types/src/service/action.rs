use std::collections::HashMap;

use crate::repository::{
    action::v1::{Action, ActionState, ActionType},
    intent::v2::Intent,
    transaction::v2::Transaction,
};

#[derive(Debug, Clone)]
pub struct ActionData {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs: HashMap<String, Vec<Transaction>>,
}

impl ActionData {
    pub fn get_intent_and_txs_by_its_tx_id(
        &self,
        tx_id: &str,
    ) -> Result<(Intent, Vec<Transaction>), String> {
        for (intent_id, txs) in &self.intent_txs {
            for tx in txs {
                if tx.id == tx_id {
                    let intent = self
                        .intents
                        .iter()
                        .find(|intent| intent.id == *intent_id)
                        .ok_or_else(|| format!("Intent with id {intent_id} not found"))?;
                    return Ok((intent.clone(), txs.clone()));
                }
            }
        }

        Err(format!(
            "Transaction with id {tx_id} not found in intent_txs"
        ))
    }
    pub fn get_tx(&self, tx_id: &str) -> Result<&Transaction, String> {
        for txs in self.intent_txs.values() {
            for tx in txs {
                if tx.id == tx_id {
                    return Ok(tx);
                }
            }
        }

        Err(format!(
            "Transaction with id {tx_id} not found in intent_txs"
        ))
    }

    pub fn get_txs_of_tx_group(&self, tx_id: &str) -> Result<Vec<String>, String> {
        let (group_index, id_index) = self.flatten_intent_txs();

        let group_key = id_index
            .get(tx_id)
            .ok_or_else(|| format!("Transaction with id {tx_id} not found in intent_txs"))?;

        group_index.get(group_key).cloned().ok_or_else(|| {
            format!("Group key {group_key:?} not found in intent_txs for transaction {tx_id}")
        })
    }

    pub fn flatten_intent_txs(&self) -> (HashMap<u16, Vec<String>>, HashMap<String, u16>) {
        let mut group_index: HashMap<u16, Vec<String>> = HashMap::new();
        let mut id_index: HashMap<String, u16> = HashMap::new();

        for txs in self.intent_txs.values() {
            for tx in txs {
                let group_key = tx.group;
                group_index
                    .entry(group_key)
                    .or_default()
                    .push(tx.id.clone());
                id_index.insert(tx.id.clone(), group_key);
            }
        }

        (group_index, id_index)
    }
}

pub struct RollUpStateResp {
    pub previous_state: ActionState,
    pub current_state: ActionState,
    pub action: Action,
    pub link_id: String,
    pub action_type: ActionType,
    pub action_id: String,
    pub intents: Vec<Intent>,
    pub intent_txs: HashMap<String, Vec<Transaction>>,
}

impl From<(ActionData, ActionState)> for RollUpStateResp {
    fn from((data, previous_state): (ActionData, ActionState)) -> Self {
        Self {
            previous_state,
            current_state: data.action.state.clone(),
            action: data.action.clone(),
            link_id: data.action.link_id.clone(),
            action_type: data.action.r#type.clone(),
            action_id: data.action.id.clone(),
            intents: data.intents.clone(),
            intent_txs: data.intent_txs,
        }
    }
}
