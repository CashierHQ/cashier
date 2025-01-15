use crate::repositories::{intent_store, user_wallet_store};

pub async fn is_intent_creator(caller: String, intent_id: &str) -> Result<bool, String> {
    let user_id = match user_wallet_store::get(&caller) {
        Some(user_id) => user_id,
        None => {
            return Err("User not found".to_string());
        }
    };
    let intent = intent_store::get(intent_id);
    match intent {
        Some(intent) => Ok(intent.creator_id == user_id),
        None => {
            return Err("Intent not found".to_string());
        }
    }
}
