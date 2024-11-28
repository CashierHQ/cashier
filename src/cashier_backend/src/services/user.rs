use uuid::Uuid;

use crate::{
    store::{user_store, user_wallet_store},
    types::user::User,
};

pub fn create_new() -> Result<User, String> {
    if is_existed() {
        return Err("User already existed".to_string());
    }

    let caller = ic_cdk::api::caller();

    let id = Uuid::new_v4();
    let id_str = id.to_string();

    let user = User::new(id_str.clone(), None, caller.to_string());

    user_store::create(user.to_persistence());
    user_wallet_store::create(caller.to_string(), id_str);

    Ok(user)
}

pub fn get() -> Option<User> {
    let caller = ic_cdk::api::caller();
    let user_id = match user_wallet_store::get(&caller.to_string()) {
        Some(user_id) => user_id,
        None => return None,
    };

    let user = user_store::get(&user_id);

    match user {
        Some(user) => Some(User::from_persistence(user)),
        None => None,
    }
}

pub fn is_existed() -> bool {
    let caller = ic_cdk::api::caller();
    user_wallet_store::get(&caller.to_string()).is_some()
}
