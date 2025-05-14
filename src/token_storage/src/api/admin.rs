use candid::Principal;
use ic_cdk::update;

use crate::{
    constant::default_tokens::get_default_tokens,
    repository::{
        balance_cache::BalanceCacheRepository, token_registry::TokenRegistryRepository,
        user_token::TokenRepository,
    },
    types::{RegisterTokenInput, TokenDto, TokenId},
};

// Token Registry Management APIs
#[update]
pub fn register_token(input: RegisterTokenInput) -> Result<TokenId, String> {
    let caller = ic_cdk::caller();

    // Only admin can register tokens (you may want to add proper access control)
    // if caller != admin_principal() {
    //     return Err("Not authorized to register tokens".to_string());
    // }

    let registry = TokenRegistryRepository::new();
    registry.register_token(input)
}

// Administrative APIs
#[update]
pub fn reset_user_tokens(address: String) -> Result<(), String> {
    // Admin check should be implemented here
    let caller = ic_cdk::caller();

    // Example simple admin check
    // if caller != Principal::from_text("your-admin-principal-id").unwrap() {
    //     return Err("Not authorized for admin operations".to_string());
    // }

    let token_repository = TokenRepository::new();
    token_repository.reset_token_list(&address);
    Ok(())
}

#[update]
pub fn query_user_token(user_pid_str: String) -> Result<Vec<TokenDto>, String> {
    let user_pid =
        Principal::from_text(&user_pid_str).map_err(|_| "Invalid user principal ID".to_string())?;

    let repository = TokenRepository::new();
    let balance_cache = BalanceCacheRepository::new();

    let tokens = repository.list_tokens(&user_pid.to_text());
    let balances = balance_cache
        .get_all_balances(&user_pid.to_text())
        .into_iter()
        .collect::<std::collections::HashMap<_, _>>();

    // enrich cache balance for list return
    let result = tokens
        .into_iter()
        .map(|mut token| {
            if let Some(balance) = balances.get(&token.get_address_from_id()) {
                token.balance = Some(balance.clone());
            }
            token
        })
        .collect();

    Ok(result)
}

#[update]
pub fn initialize_registry() -> Result<(), String> {
    // Admin check should be implemented here

    // Example simple admin check
    // if caller != Principal::from_text("your-admin-principal-id").unwrap() {
    //     return Err("Not authorized for admin operations".to_string());
    // }

    let registry = TokenRegistryRepository::new();
    registry.delete_all()?;
    registry.add_bulk_tokens(get_default_tokens())?;

    Ok(())
}
