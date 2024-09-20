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

    let new_user = User {
        id: id.to_string(),
        email: None,
        wallet: caller.to_string(),
    };

    user_store::create(id.to_string(), new_user);
    user_wallet_store::create(caller.to_string(), id.to_string());

    Ok(User {
        id: id.to_string(),
        email: None,
        wallet: caller.to_string(),
    })
}

pub fn get() -> Option<User> {
    let caller = ic_cdk::api::caller();
    let user_id = match user_wallet_store::get(&caller.to_string()) {
        Some(user_id) => user_id,
        None => return None,
    };
    user_store::get(&user_id)
}

pub fn is_existed() -> bool {
    let caller = ic_cdk::api::caller();
    user_wallet_store::get(&caller.to_string()).is_some()
}
