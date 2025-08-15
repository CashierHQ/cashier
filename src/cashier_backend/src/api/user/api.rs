// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::dto::user::UserDto;
use ic_cdk::{query, update};
use log::{debug, info};

use crate::{api::guard::is_not_anonymous, services};

#[update(guard = "is_not_anonymous")]
fn create_user() -> Result<UserDto, String> {
    info!("[create_user]");
    services::user::create_new()
}

#[query(guard = "is_not_anonymous")]
async fn get_user() -> Result<UserDto, String> {
    debug!("[get_user]");
    let user = services::user::get().ok_or("User not found")?;
    Ok(user)
}
