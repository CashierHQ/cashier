use uuid::Uuid;

use crate::{
    store::action_store,
    types::action::{Action, CreateActionInput},
};

pub fn create(action: CreateActionInput) -> Result<Action, String> {
    let id = Uuid::new_v4();

    let action = Action::from_input(id.to_string(), action);

    action_store::create(action);

    match action_store::get(&id.to_string()) {
        Some(action) => Ok(action),
        None => Err("Failed to create action".to_string()),
    }
}
