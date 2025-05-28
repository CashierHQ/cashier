// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use std::collections::HashMap;

use cashier_types::ActionState;

#[derive(Debug, Clone)]
pub struct ActionData {
    pub action: cashier_types::Action,
    pub intents: Vec<cashier_types::Intent>,
    pub intent_txs: HashMap<String, Vec<cashier_types::Transaction>>,
}

pub struct RollUpStateResp {
    pub previous_state: ActionState,
    pub current_state: ActionState,
    pub action: cashier_types::Action,
    pub link_id: String,
    pub action_type: cashier_types::ActionType,
    pub action_id: String,
    pub intents: Vec<cashier_types::Intent>,
    pub intent_txs: HashMap<String, Vec<cashier_types::Transaction>>,
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
    ) -> Result<(cashier_types::Intent, Vec<cashier_types::Transaction>), String> {
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
