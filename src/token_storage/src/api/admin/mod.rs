// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_cdk::{query, update};

use crate::{
    constant::default_tokens::get_default_tokens,
    repository::{token_registry::TokenRegistryRepository, user_token::TokenRepository},
    services::token_registry::TokenRegistryService,
    types::{TokenDto, TokenRegistryMetadata},
};

/// Gets the current version of the token registry
/// This can be used by clients to check if they need to refresh their token lists
#[query]
pub fn get_registry_version() -> u64 {
    let service = TokenRegistryService::new();
    service.get_metadata().version
}

/// Gets the full metadata of the token registry
/// Includes version number and last updated timestamp
#[query]
pub fn get_registry_metadata() -> TokenRegistryMetadata {
    let service = TokenRegistryService::new();
    service.get_metadata()
}

#[query]
pub fn get_registry_tokens() -> Vec<TokenDto> {
    let service = TokenRegistryService::new();
    service
        .list_tokens()
        .iter()
        .map(|token| TokenDto::from(token.clone()))
        .collect()
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

// TODO: remove this function when release

#[update]
pub fn reset_user_tokens(address: String) -> Result<(), String> {
    // Example simple admin check
    // if caller != Principal::from_text("your-admin-principal-id").unwrap() {
    //     return Err("Not authorized for admin operations".to_string());
    // }

    let token_repository = TokenRepository::new();
    token_repository.reset_token_list(&address);
    Ok(())
}
