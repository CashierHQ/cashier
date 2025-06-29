// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::HashMap;

use cashier_types::{
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
            intent_txs: data.intent_txs.clone(),
        }
    }
}

impl ActionData {
    pub fn get_intent_and_txs_by_its_tx_id(
        &self,
        tx_id: String,
    ) -> Result<(Intent, Vec<Transaction>), String> {
        for (intent_id, txs) in &self.intent_txs {
            for tx in txs {
                if tx.id == tx_id {
                    let intent = self
                        .intents
                        .iter()
                        .find(|intent| intent.id == *intent_id)
                        .ok_or_else(|| format!("Intent with id {} not found", intent_id))?;
                    return Ok((intent.clone(), txs.clone()));
                }
            }
        }

        Err(format!(
            "Transaction with id {} not found in intent_txs",
            tx_id
        ))
    }
    pub fn get_tx(&self, tx_id: &str) -> Result<&Transaction, String> {
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

#[derive(Debug, Clone)]
pub struct UpdateActionArgs {
    pub action_id: String,
    pub link_id: String,
    // using for marking the method called outside of icrc-112
    pub execute_wallet_tx: bool,
}
