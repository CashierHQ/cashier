// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_common::build_data::BuildData;
use ic_cdk::{api::msg_caller, query, update};
use log::{debug, info};
use token_storage_types::{
    TokenId,
    token::{RegistryStats, TokenDto, TokenListResponse, UserTokens},
};

use crate::{
    api::state::{get_state}, build_data::canister_build_data, constant::default_tokens::get_default_tokens, types::TokenRegistryMetadata
};

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
    debug!("[get_canister_build_data]");
    canister_build_data()
}

/// Gets the current version of the token registry
/// This can be used by clients to check if they need to refresh their token lists
#[query]
pub fn admin_get_registry_version() -> u64 {
    debug!("[admin_get_registry_version]");
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });
    let service = get_state().token_registry;
    service.get_metadata().version
}

/// Gets the full metadata of the token registry
/// Includes version number and last updated timestamp
#[query]
pub fn admin_get_registry_metadata() -> TokenRegistryMetadata {
    debug!("[admin_get_registry_metadata]");
    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });
    let service = get_state().token_registry;
    service.get_metadata()
}

#[query]
pub fn admin_get_registry_tokens(only_enable: bool) -> Vec<TokenDto> {
    debug!("[admin_get_registry_tokens] only_enable: {only_enable}");

    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });

    let service = get_state().token_registry;
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
pub fn admin_initialize_registry() -> Result<(), String> {
    info!("[admin_initialize_registry]");

    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });

    let service = get_state();
    let mut registry = service.token_registry;
    registry.delete_all().expect("Should be able to delete registry");
    registry.add_bulk_tokens(get_default_tokens()).expect("Should be able to add default tokens");

    Ok(())
}

#[query]
pub fn admin_get_stats() -> Result<RegistryStats, String> {
    debug!("[admin_get_stats]");

    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });

    let state = get_state();
    let token_registry = state.token_registry;
    let list_tokens = token_registry.list_tokens();
    let total_tokens = list_tokens.len();
    let total_enabled_default = list_tokens.iter().filter(|t| t.enabled_by_default).count();

    Ok(RegistryStats {
        total_tokens,
        total_enabled_default,
    })
}

#[query]
pub fn admin_get_user_tokens(wallet: Principal) -> Result<UserTokens, String> {
    debug!("[admin_get_user_tokens] wallet: {wallet}");

    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });

    let state = get_state();
    let token_registry_service = state.token_registry;
    let user_token_service = state.user_token;

    // Check if user's token list exists
    let user_token_list = user_token_service
        .get_token_list(&wallet)
        .unwrap_or_default();

    let registry_tokens = token_registry_service.list_tokens();

    Ok(UserTokens {
        enabled: user_token_list.enable_list.len(),
        registry_tokens: registry_tokens.len(),
        version: user_token_list.version,
    })
}

#[query]
pub fn admin_list_tokens_by_wallet(wallet: Principal) -> Result<TokenListResponse, String> {
    debug!("[admin_list_tokens_by_wallet] wallet: {wallet}");

    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });

    let state = get_state();
    let token_registry_service = state.token_registry;
    let user_preference_service = state.user_preference;
    let user_token_service = state.user_token;
    let registry_metadata = token_registry_service.get_metadata();

    let user_preferences = user_preference_service.get_preferences(&wallet);

    match user_token_service.get_token_list(&wallet) {
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

                for token_id in list.enable_list {
                    if let Some(registry_token) = registry_tokens
                        .iter()
                        .find(|t| t.details.token_id() == token_id)
                        && seen_token_ids.insert(registry_token.details.token_id())
                    {
                        let mut token_dto = TokenDto::from(registry_token.clone());
                        token_dto.enabled = true;
                        filtered_tokens.push(token_dto);
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
pub fn admin_get_user_balance(
    wallet: Principal,
) -> Result<std::collections::HashMap<TokenId, u128>, String> {
    debug!("[admin_get_user_balance] wallet: {wallet}");

    ensure_is_admin().unwrap_or_else(|err| {
        ic_cdk::trap(format!("Admin check failed: {err}"));
    });

    let state = get_state();
    let user_token_service = state.user_token;

    // Retrieve all balances for the user
    let balances = user_token_service.get_all_user_balances(&wallet);

    Ok(balances)
}
