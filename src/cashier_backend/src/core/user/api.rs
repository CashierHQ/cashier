// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use ic_cdk::{query, update};

use crate::{core::guard::is_not_anonymous, services};

use super::types::UserDto;

#[update(guard = "is_not_anonymous")]
fn create_user() -> Result<UserDto, String> {
    
    services::user::create_new()
}

#[query(guard = "is_not_anonymous")]
async fn get_user() -> Result<UserDto, String> {
    let user = services::user::get().ok_or("User not found")?;
    Ok(user)
}
