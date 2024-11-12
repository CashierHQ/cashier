use uuid::Uuid;

use crate::store::action_store;
use crate::types::action::Action;
use crate::types::action::Status;
use crate::types::transaction::Transaction;

pub struct ActionCreateInput {
    pub status: Status,
    pub transactions: Vec<Transaction>,
}

impl ActionCreateInput {
    pub fn to_entity(self, id: String) -> Action {
        Action {
            id,
            status: self.status,
            transactions: self.transactions,
        }
    }
}

pub fn create(action: ActionCreateInput) -> Result<Action, String> {
    let id = Uuid::new_v4();

    let action = action.to_entity(id.to_string());

    action_store::create(id.to_string(), action);

    match action_store::get(&id.to_string()) {
        Some(action) => Ok(action),
        None => Err("Failed to create action".to_string()),
    }
}

pub fn update_status(id: String, status: Status) -> Result<Action, String> {
    match action_store::get(&id) {
        Some(mut action) => {
            action.status = status;
            action_store::update(id.clone(), action.clone());
            Ok(action)
        }
        None => Err("Action not found".to_string()),
    }
}
