use ic_cdk::{query, update};

use crate::types::user::User;
#[update]
fn create_user() -> Result<(), String> {
    Ok(())
}

#[query]
async fn get_user() -> Result<User, String> {
    Ok(User {
        id: "uid123456789".to_string(),
        email: None,
        wallet: ic_cdk::api::caller().to_string(),
    })
}
