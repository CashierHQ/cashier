use ic_cdk::{query, update};

use crate::{services, types::user::User};

#[update]
fn create_user() -> Result<String, String> {
    let id = services::user::create_new();
    match id {
        Ok(id) => Ok(id),
        Err(e) => Err(e),
    }
}

#[query]
async fn get_user() -> Result<User, String> {
    let user = services::user::get().ok_or("User not found")?;
    Ok(user)
}
