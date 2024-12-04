use crate::{
    repositories::action_store,
    types::action::{Action, Status},
};

pub fn update_status(id: String, status: Status) -> Result<Action, String> {
    match action_store::get(&id) {
        Some(mut action) => {
            action.status = status;
            action_store::update(id.clone(), action.clone());
            Ok(Action::from_persistence(action))
        }
        None => Err("Action not found".to_string()),
    }
}
