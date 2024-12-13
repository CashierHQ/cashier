use crate::{
    repositories::intent_store,
    types::intent::{Intent, IntentState},
};

pub fn update_status(id: String, status: IntentState) -> Result<Intent, String> {
    match intent_store::get(&id) {
        Some(mut intent) => {
            intent.status = status.to_string();
            intent_store::update(id.clone(), intent.to_persistence());
            Ok(intent)
        }
        None => Err("Intent not found".to_string()),
    }
}
