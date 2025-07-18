// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_cdk::{query, update};

use crate::{
    api::admin::types::{RegistryStats, UserTokens},
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
pub fn get_registry_tokens(only_enable: bool) -> Vec<TokenDto> {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(&format!("Admin check failed: {}", err));
    });
    let service = TokenRegistryService::new();
    let list: Vec<TokenDto> = service
        .list_tokens()
        .iter()
        .map(|token| TokenDto::from(token.clone()))
        .collect();

    if only_enable {
        list.into_iter().filter(|token| token.enabled).collect()
    } else {
        list
    }
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
    let total_enabled_default = list_tokens.iter().filter(|t| t.enabled_by_default).count();

    Ok(RegistryStats {
        total_tokens,
        total_enabled_default,
    })
}

#[query]
pub fn get_user_tokens(wallet: String) -> Result<UserTokens, String> {
    let caller = Principal::from_text(&wallet).map_err(|_| "Invalid wallet address".to_string())?;
    let token_registry_service = TokenRegistryService::new();
    let user_token_service = UserTokenService::new();

    // Check if user's token list exists
    let user_token_list = user_token_service
        .get_token_list(&caller.to_string())
        .unwrap_or_default();

    let registry_tokens = token_registry_service.list_tokens();

    Ok(UserTokens {
        enabled: user_token_list.enable_list.len(),
        registry_tokens: registry_tokens.len(),
        version: user_token_list.version,
    })
}
