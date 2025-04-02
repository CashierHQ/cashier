use ic_cdk::update;

use crate::{
    repository::{token_registry::TokenRegistryRepository, user_token::TokenRepository},
    types::{RegisterTokenInput, TokenId},
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
pub fn initialize_registry() -> Result<(), String> {
    // Admin check should be implemented here
    let caller = ic_cdk::caller();

    // Example simple admin check
    // if caller != Principal::from_text("your-admin-principal-id").unwrap() {
    //     return Err("Not authorized for admin operations".to_string());
    // }

    let registry = TokenRegistryRepository::new();
    registry.initialize_default_tokens();

    Ok(())
}
