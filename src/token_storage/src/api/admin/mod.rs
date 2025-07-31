// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_common::build_data::BuildData;
use ic_cdk::{api::msg_caller, query, update};

use crate::{
    api::{
        admin::types::{RegistryStats, UserTokens},
        token_v2::types::TokenListResponse,
    },
    build_data::canister_build_data,
    constant::default_tokens::get_default_tokens,
    repository::token_registry::TokenRegistryRepository,
    services::{
        token_registry::TokenRegistryService, user_preference::UserPreferenceService,
        user_token::UserTokenService,
    },
    types::{TokenDto, TokenRegistryMetadata},
};

pub mod types;

fn ensure_is_admin() -> Result<(), String> {
    let caller = msg_caller();

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

/// Returns the build data of the canister.
#[query]
fn get_canister_build_data() -> BuildData {
    canister_build_data()
}

/// Gets the current version of the token registry
/// This can be used by clients to check if they need to refresh their token lists
#[query]
pub fn get_registry_version() -> u64 {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });
    let service = TokenRegistryService::new();
    service.get_metadata().version
}

/// Gets the full metadata of the token registry
/// Includes version number and last updated timestamp
#[query]
pub fn get_registry_metadata() -> TokenRegistryMetadata {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });
    let service = TokenRegistryService::new();
    service.get_metadata()
}

#[query]
pub fn get_registry_tokens(only_enable: bool) -> Vec<TokenDto> {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
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
        eprintln!("Admin check failed: {err}"); // Log the error
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
        ic_cdk::trap(format!("Admin check failed: {err}"));
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

#[query]
pub fn list_tokens_by_wallet(wallet: String) -> Result<TokenListResponse, String> {
    let caller = Principal::from_text(&wallet).map_err(|_| "Invalid wallet address".to_string())?;
    let token_registry_service = TokenRegistryService::new();
    let user_preference_service = UserPreferenceService::new();
    let user_token_service = UserTokenService::new();
    let registry_metadata = token_registry_service.get_metadata();

    let user_preferences = user_preference_service.get_preferences(&caller.to_string());

    match user_token_service.get_token_list(&caller.to_string()) {
        Ok(list) => {
            let need_update_version = list.version < registry_metadata.version;

            if list.enable_list.is_empty() {
                Ok(TokenListResponse {
                    tokens: token_registry_service
                        .list_tokens()
                        .iter()
                        .map(|registry_token| TokenDto::from(registry_token.clone()))
                        .collect(),
                    need_update_version: true,
                    perference: Some(user_preferences),
                })
            } else {
                let registry_tokens = token_registry_service.list_tokens();
                let mut filtered_tokens = Vec::new();
                let mut seen_token_ids = std::collections::HashSet::new();

                for token_id in &list.enable_list {
                    if let Some(registry_token) = registry_tokens.iter().find(|t| &t.id == token_id)
                    {
                        if seen_token_ids.insert(registry_token.id.clone()) {
                            let mut token_dto = TokenDto::from(registry_token.clone());
                            token_dto.enabled = true;
                            filtered_tokens.push(token_dto);
                        }
                    }
                }

                Ok(TokenListResponse {
                    tokens: filtered_tokens,
                    need_update_version,
                    perference: Some(user_preferences),
                })
            }
        }
        Err(_) => Ok(TokenListResponse {
            tokens: token_registry_service
                .list_tokens()
                .iter()
                .map(|registry_token| TokenDto::from(registry_token.clone()))
                .collect(),
            need_update_version: true,
            perference: Some(user_preferences),
        }),
    }
}

#[query]
pub fn get_user_balance(wallet: String) -> Result<std::collections::HashMap<String, u128>, String> {
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });

    let caller = Principal::from_text(&wallet).map_err(|_| "Invalid wallet address".to_string())?;
    let user_token_service = UserTokenService::new();

    // Retrieve all balances for the user
    let balances = user_token_service.get_all_user_balances(&caller.to_string());

    Ok(balances)
}
