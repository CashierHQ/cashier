use candid::Principal;
use ic_cdk::{query, update};

use crate::{repository::TokenRepository, types::Token};

#[update]
pub fn add_token(id: String, token: Token) -> Result<(), String> {
    let repository = TokenRepository::new();
    repository.add_token(id, token);
    Ok(())
}

#[update]
pub fn remove_token(id: String) -> Result<(), String> {
    let repository = TokenRepository::new();
    repository.remove_token(&id);
    Ok(())
}

#[query]
pub fn list_tokens() -> Vec<Token> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Vec::new();
    }

    let repository = TokenRepository::new();
    repository.list_tokens(&caller.to_text())
}

ic_cdk::export_candid!();
