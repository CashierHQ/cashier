use uuid::Uuid;

use crate::{
    repositories::action_store,
    types::action::{Action, ActionStatus, ActionType, CreateActionInput},
};

pub fn create(action: CreateActionInput) -> Result<Action, String> {
    let id = Uuid::new_v4();
    let caller = ic_cdk::api::caller();

    let new_action = Action::new(
        id.to_string(),
        caller.to_text(),
        action.link_id,
        ActionStatus::Created,
        ActionType::Create,
    );

    action_store::create(new_action.to_persistence());

    match action_store::get(&id.to_string()) {
        Some(action) => Ok(Action::from_persistence(action)),
        None => Err("Failed to create action".to_string()),
    }
}
