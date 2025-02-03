use crate::repositories::{action, user_wallet};

pub fn is_action_creator(caller: String, action_id: String) -> Result<bool, String> {
    let user_wallet = match user_wallet::get(&caller) {
        Some(user_id) => user_id,
        None => {
            return Err("User not found".to_string());
        }
    };
    let intent = action::get(action_id);
    match intent {
        Some(action) => Ok(action.creator == user_wallet.user_id),
        None => {
            return Err("Action not found".to_string());
        }
    }
}
