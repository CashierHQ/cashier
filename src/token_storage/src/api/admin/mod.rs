// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_cdk::{query, update};

use crate::{
    api::admin::types::RegistryStats,
    constant::default_tokens::get_default_tokens,
    repository::token_registry::TokenRegistryRepository,
    services::{token_registry::TokenRegistryService, user_token::UserTokenService},
    types::{TokenDto, TokenRegistryMetadata},
};

pub mod types;

#[allow(deprecated)]
fn ensure_is_admin() -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller
        == Principal::from_text("rvc37-afcl7-ag74c-jyr6z-zoprx-finqf-px5k5-dqpaa-jgmzy-jgmht-dqe")
            .unwrap()
    {
        return Ok(());
    }

    // Placeholder for admin check logic
    // This should verify if the caller is an admin
    Ok(())
}

/// Gets the current version of the token registry
/// This can be used by clients to check if they need to refresh their token lists
#[query]
pub fn get_registry_version() -> u64 {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(&format!("Admin check failed: {}", err));
    });
    let service = TokenRegistryService::new();
    service.get_metadata().version
}

/// Gets the full metadata of the token registry
/// Includes version number and last updated timestamp
#[query]
pub fn get_registry_metadata() -> TokenRegistryMetadata {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(&format!("Admin check failed: {}", err));
    });
    let service = TokenRegistryService::new();
    service.get_metadata()
}

#[query]
pub fn get_registry_tokens() -> Vec<TokenDto> {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(&format!("Admin check failed: {}", err));
    });
    let service = TokenRegistryService::new();
    service
        .list_tokens()
        .iter()
        .map(|token| TokenDto::from(token.clone()))
        .collect()
}

#[update]
pub fn initialize_registry() -> Result<(), String> {
    ensure_is_admin().unwrap_or_else(|err| {
        eprintln!("Admin check failed: {}", err); // Log the error
                                                  // Return unit type `()` to satisfy `unwrap_or_else`
    });

    // Admin check should be implemented here

    let registry = TokenRegistryRepository::new();
    registry.delete_all()?;
    registry.add_bulk_tokens(&get_default_tokens())?;

    Ok(())
}

#[query]
pub fn get_stats() -> Result<RegistryStats, String> {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(&format!("Admin check failed: {}", err));
    });

    let service = TokenRegistryService::new();
    let list_tokens = service.list_tokens();
    let total_tokens = list_tokens.len();

    Ok(RegistryStats { total_tokens })
}
