use cashier_types::{User, UserWallet};
use uuid::Uuid;

use crate::{
    core::user::types::UserDto,
    repositories::{self, user, user_wallet},
};

pub fn create_new() -> Result<UserDto, String> {
    if is_existed() {
        return Err("User already existed".to_string());
    }

    let id = Uuid::new_v4();
    let id_str = id.to_string();

    let user = User {
        id: id_str.clone(),
        email: None,
    };

    let user_wallet = UserWallet {
        user_id: id_str.clone(),
    };

    let caller = ic_cdk::api::caller();

    repositories::user::create(user.clone());
    repositories::user_wallet::create(caller.to_text(), user_wallet);

    Ok(UserDto {
        id: id_str,
        email: None,
        wallet: caller.to_text(),
    })
}

pub fn get() -> Option<UserDto> {
    let caller = ic_cdk::api::caller();
    let user_wallet = match user_wallet::get(&caller.to_string()) {
        Some(user_id) => user_id,
        None => return None,
    };

    let user = user::get(user_wallet.user_id);

    match user {
        Some(user) => Some(UserDto {
            id: user.id,
            email: user.email,
            wallet: caller.to_text(),
        }),
        None => None,
    }
}

pub fn is_existed() -> bool {
    let caller = ic_cdk::api::caller();
    user_wallet::get(&caller.to_string()).is_some()
}
