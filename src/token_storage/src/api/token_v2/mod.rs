use crate::services::user_token::UserTokenService;
use crate::types::TokenId;
use candid::Principal;
use ic_cdk::api::caller;
use ic_cdk::{query, update};

pub mod types;

use types::{AddTokenInput, AddTokensInput, UpdateTokenInput};

fn ensure_not_anonymous() -> Result<String, String> {
    let caller = caller();
    if caller == Principal::anonymous() {
        return Err("Anonymous caller is not allowed".to_string());
    }
    Ok(caller.to_text())
}

#[update]
pub fn add_token(input: AddTokenInput) -> Result<(), String> {
    let user_id = ensure_not_anonymous()?;
    let service = UserTokenService::new();

    service.add_token(&user_id, &input.token_id)
}

#[update]
pub fn add_token_batch(input: AddTokensInput) -> Result<Vec<TokenId>, String> {
    let user_id = ensure_not_anonymous()?;
    let service = UserTokenService::new();

    service.add_tokens(&user_id, &input.token_ids)
}

#[update]
pub fn update_token(input: UpdateTokenInput) -> Result<(), String> {
    let user_id = ensure_not_anonymous()?;
    let service = UserTokenService::new();

    service.update_token_status(&user_id, &input.token_id, &input.is_enabled)
}

#[update]
pub fn update_token_batch(inputs: Vec<UpdateTokenInput>) -> Result<(), String> {
    let user_id = ensure_not_anonymous()?;
    let service = UserTokenService::new();

    for input in inputs {
        service.update_token_status(&user_id, &input.token_id, &input.is_enabled)?;
    }

    Ok(())
}
