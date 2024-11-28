use uuid::Uuid;

use crate::{
    store::action_store,
    types::action::{Action, ActionType, CreateActionInput, Status},
};

pub fn create(action: CreateActionInput) -> Result<Action, String> {
    let id = Uuid::new_v4();
    let caller = ic_cdk::api::caller();

    let action = Action::new(
        id.to_string(),
        caller.to_text(),
        action.link_id,
        Status::Created,
        ActionType::Create,
        vec![],
    );

    action_store::create(action.to_persistence());

    match action_store::get(&id.to_string()) {
        Some(action) => Ok(action),
        None => Err("Failed to create action".to_string()),
    }
}
