use ic_cdk::{query, update};

use crate::{core::guard::is_not_anonymous, services};

use super::types::User;

#[update(guard = "is_not_anonymous")]
fn create_user() -> Result<User, String> {
    let user = services::user::create_new();
    match user {
        Ok(user) => Ok(user),
        Err(e) => Err(e),
    }
}

#[query(guard = "is_not_anonymous")]
async fn get_user() -> Result<User, String> {
    let user = services::user::get().ok_or("User not found")?;
    Ok(user)
}
