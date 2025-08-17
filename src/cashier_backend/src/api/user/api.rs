// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::dto::user::UserDto;
use ic_cdk::{api::msg_caller, query, update};
use log::{debug, info};

use crate::{
    api::{guard::is_not_anonymous, state::get_state},
    utils::runtime::RealIcEnvironment,
};

#[update(guard = "is_not_anonymous")]
fn create_user() -> Result<UserDto, String> {
    info!("[create_user]");

    let caller = msg_caller();
    let user = get_state::<RealIcEnvironment>()
        .user_service
        .create_new(caller)
        .expect("Unable to create user");
    Ok(user)
}

#[query(guard = "is_not_anonymous")]
fn get_user() -> Result<UserDto, &'static str> {
    debug!("[get_user]");
    let caller = msg_caller();
    let state = get_state::<RealIcEnvironment>();
    state
        .user_service
        .get_user_dto(&caller)
        .ok_or("User not found")
}
