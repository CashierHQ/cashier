// File: src/token_storage/src/api.rs
use candid::Principal;
use ic_cdk::{query, update};

use crate::{
    repository::{
        balance_cache::BalanceCacheRepository, token_registry::TokenRegistryRepository,
        user_preference::UserPreferenceRepository, user_token::TokenRepository,
    },
    types::{
        AddTokenInput, RegisterTokenInput, RemoveTokenInput, TokenDto, TokenId, UserPreference,
        UserPreferenceInput,
    },
};

#[query]
pub fn list_registry_tokens() -> Result<Vec<TokenDto>, String> {
    let registry = TokenRegistryRepository::new();
    let tokens = registry.list_tokens();

    let result = tokens
        .into_iter()
        .map(|token| TokenDto {
            id: token.id,
            icrc_ledger_id: token.icrc_ledger_id,
            icrc_index_id: token.icrc_index_id,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chain: token.chain.to_str(),
            enabled: token.is_default,
            balance: None,
        })
        .collect();

    Ok(result)
}

// User Token Management APIs
#[update]
pub fn add_token(input: AddTokenInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let token_id = match input.token_id {
        Some(id) => id,
        None => {
            // Generate token ID if not provided
            let chain = crate::types::Chain::from_str(&input.chain)
                .map_err(|e| format!("Invalid chain: {}", e))?;

            crate::types::RegistryToken::generate_id(&chain, input.ledger_id.as_ref())
                .map_err(|e| format!("Failed to generate token ID: {}", e))?
        }
    };

    let registry = TokenRegistryRepository::new();
    if registry.get_token(&token_id).is_none() {
        return Err(format!("Token with ID {} not found in registry", token_id));
    }

    let repository = TokenRepository::new();
    repository.add_token(caller.to_text(), token_id)
}

#[update]
pub fn remove_token(input: RemoveTokenInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let repository = TokenRepository::new();
    repository.remove_token(&caller.to_text(), &input.token_id)
}

#[query]
pub fn list_tokens() -> Result<Vec<TokenDto>, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let repository = TokenRepository::new();
    let balance_cache = BalanceCacheRepository::new();

    let tokens = repository.list_tokens(&caller.to_text());
    let balances = balance_cache
        .get_all_balances(&caller.to_text())
        .into_iter()
        .collect::<std::collections::HashMap<_, _>>();

    // Add balance information to tokens
    let result = tokens
        .into_iter()
        .map(|mut token| {
            if let Some(balance) = balances.get(&token.id) {
                token.balance = Some(balance.clone());
            }
            token
        })
        .collect();

    Ok(result)
}

// User Preference APIs
#[query]
pub fn get_user_preference() -> Result<UserPreference, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let user_preference = UserPreferenceRepository::new();
    let result = user_preference.get(&caller.to_text());

    Ok(result)
}

#[update]
pub fn update_user_preference(input: UserPreferenceInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let user_preference = UserPreferenceRepository::new();

    let old_record = user_preference.get(&caller.to_text());
    let updated_record = UserPreference::from_input(&input, Some(&old_record))?;

    user_preference.update(caller.to_text(), updated_record);

    Ok(())
}

// Balance Cache APIs
#[update]
pub fn update_token_balance(token_id: String, balance: u128) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    // Verify token exists
    let registry = TokenRegistryRepository::new();
    if registry.get_token(&token_id).is_none() {
        return Err(format!("Token with ID {} not found in registry", token_id));
    }

    let balance_cache = BalanceCacheRepository::new();
    balance_cache.update_balance(caller.to_text(), token_id, balance);

    Ok(())
}

#[update]
pub fn update_bulk_balances(token_balances: Vec<(String, u128)>) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let balance_cache = BalanceCacheRepository::new();
    balance_cache.update_bulk_balances(caller.to_text(), token_balances);

    Ok(())
}

#[query]
pub fn default_list_tokens() -> Result<Vec<TokenDto>, String> {
    let registry = TokenRegistryRepository::new();
    let tokens = registry.list_default_tokens();

    let result = tokens
        .into_iter()
        .map(|token| TokenDto {
            id: token.id,
            icrc_ledger_id: token.icrc_ledger_id,
            icrc_index_id: token.icrc_index_id,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chain: token.chain.to_str(),
            enabled: true,
            balance: None,
        })
        .collect();

    Ok(result)
}

// Init and first login helper
#[update]
pub fn initialize_user_tokens() -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let token_repository = TokenRepository::new();
    let user_preference = UserPreferenceRepository::new();

    let default_perference = UserPreference::default();

    // Add default tokens if user has no tokens yet
    token_repository.add_default_tokens(&caller.to_text());
    user_preference.add(caller.to_text(), default_perference);

    Ok(())
}

// Helper to get a single token
#[query]
pub fn get_token(token_id: String) -> Result<TokenDto, String> {
    let registry = TokenRegistryRepository::new();

    if let Some(token) = registry.get_token(&token_id) {
        Ok(TokenDto {
            id: token.id,
            icrc_ledger_id: token.icrc_ledger_id,
            icrc_index_id: token.icrc_index_id,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chain: token.chain.to_str(),
            enabled: token.is_default,
            balance: None,
        })
    } else {
        Err(format!("Token with ID {} not found", token_id))
    }
}

ic_cdk::export_candid!();
