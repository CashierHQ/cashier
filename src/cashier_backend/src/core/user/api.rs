use ic_cdk::{query, update};

use crate::{services, types::user::User};

#[update]
fn create_user() -> Result<User, String> {
    let user = services::user::create_new();
    match user {
        Ok(user) => Ok(user),
        Err(e) => Err(e),
    }
}

#[query]
async fn get_user() -> Result<User, String> {
    let user = services::user::get().ok_or("User not found")?;
    Ok(user)
}
