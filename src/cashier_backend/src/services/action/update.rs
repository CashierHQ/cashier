use crate::{
    repositories::action_store,
    types::action::{Action, ActionState},
};

pub fn update_status(id: String, status: ActionState) -> Result<Action, String> {
    match action_store::get(&id) {
        Some(mut action) => {
            action.status = status.to_string();
            action_store::update(id.clone(), action.to_persistence());
            Ok(action)
        }
        None => Err("Action not found".to_string()),
    }
}
