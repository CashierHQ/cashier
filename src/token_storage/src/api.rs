use candid::Principal;
use ic_cdk::{query, update};

use crate::{
    repository::TokenRepository,
    types::{AddTokenInput, Chain, RemoveTokenInput, UserToken},
};

#[update]
pub fn add_token(input: AddTokenInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allow anonymous call".to_string());
    }

    // validate required fields
    if input.chain == Chain::IC {
        if input.ledger_id.is_none() {
            return Err("Ledger ID is required for IC chain".to_string());
        }
    }

    let repository = TokenRepository::new();
    repository.add_token(caller.to_text(), UserToken::from(input));
    Ok(())
}

#[update]
pub fn remove_token(input: RemoveTokenInput) -> Result<(), String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Not allow anonymous call".to_string());
    }

    if input.chain == Chain::IC {
        if input.ledger_id.is_none() {
            return Err("Ledger ID is required for IC chain".to_string());
        } else {
            let repository = TokenRepository::new();

            let find = |t: &UserToken| t.chain == Chain::IC && t.icrc_ledger_id == input.ledger_id;

            // method to find the token
            repository.remove_token(&caller.to_text(), &find);
        }
    }

    Ok(())
}

#[query]
pub fn list_tokens() -> Result<Vec<UserToken>, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allow anonymous call".to_string());
    }

    let repository = TokenRepository::new();
    let result = repository.list_tokens(&caller.to_text());

    Ok(result)
}

ic_cdk::export_candid!();
