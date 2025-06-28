// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::HashSet;

use candid::Principal;
use ic_cdk::{query, update};
use types::{RegisterTokenInput, UpdateTokenBalanceInput};

use crate::{
    services::{
        token_registry::TokenRegistryService, user_preference::UserPreferenceService,
        user_token::UserTokenService,
    },
    types::{TokenDto, TokenId, UserPreference},
};

pub mod types;
pub use types::{AddTokenInput, AddTokensInput, TokenListResponse, UpdateTokenStatusInput};

/// API layer combining token registry and user token functionality
pub struct TokenApi {
    user_token_service: UserTokenService,
    token_registry_service: TokenRegistryService,
    user_perference_service: UserPreferenceService,
}

impl TokenApi {
    pub fn new() -> Self {
        Self {
            user_token_service: UserTokenService::new(),
            token_registry_service: TokenRegistryService::new(),
            user_perference_service: UserPreferenceService::new(),
        }
    }

    /// List tokens for a user with flags indicating if updates are needed
    /// Returns a tuple containing:
    /// - Vec<TokenDto>: List of tokens available to the user
    /// - bool: needUpdateVersion - True if the token list version is outdated and needs sync
    pub fn list_tokens(&self, caller: &Principal) -> (Vec<TokenDto>, bool, Option<UserPreference>) {
        // Get registry metadata to check version
        let registry_metadata = self.token_registry_service.get_metadata();

        // Check if user preferences exist

        if caller == &Principal::anonymous() {
            // Anonymous users get registry tokens and don't need updates or initialization
            return (
                self.token_registry_service
                    .list_tokens()
                    .iter()
                    .map(|registry_token| TokenDto::from(registry_token.clone()))
                    .collect(),
                false, // No need to update version for anonymous,
                None,
            );
        }

        let user_preferences: crate::types::UserPreference = self
            .user_perference_service
            .get_preferences(&caller.to_string());

        // Check if user's token list exists
        match self.user_token_service.get_token_list(&caller.to_string()) {
            Ok(list) => {
                // Token list exists, check if version is outdated
                let need_update_version = list.version < registry_metadata.version;

                // If token list is empty, return registry tokens
                if list.enable_list.is_empty() && list.disable_list.is_empty() {
                    return (
                        self.token_registry_service
                            .list_tokens()
                            .iter()
                            .map(|registry_token| TokenDto::from(registry_token.clone()))
                            .collect(),
                        need_update_version,
                        Some(user_preferences),
                    );
                } else {
                    // Get user's tokens
                    let tokens = self
                        .user_token_service
                        .convert_to_token_dtos(&caller.to_string(), &list);

                    return (tokens, need_update_version, Some(user_preferences));
                }
            }
            Err(_) => {
                // Token list doesn't exist, return registry tokens and flag for initialization
                return (
                    self.token_registry_service
                        .list_tokens()
                        .iter()
                        .map(|registry_token| TokenDto::from(registry_token.clone()))
                        .collect(),
                    true, // Need to update version since it doesn't exist
                    Some(user_preferences),
                );
            }
        };
    }

    pub fn add_token(
        &self,
        caller: &Principal,
        input: AddTokenInput,
    ) -> Result<(Vec<TokenDto>, bool, Option<UserPreference>), String> {
        let token_id = &input.token_id;

        // Check if token exists in registry
        if self.token_registry_service.get_token(token_id).is_none() {
            // If token doesn't exist, try to register it first
            if let Some(token_data) = input.token_data.clone() {
                self.token_registry_service
                    .register_token(RegisterTokenInput::from(token_data))?;
                // Update registry metadata after registration
                self.token_registry_service.increase_version();
            } else {
                return Err(format!(
                    "Token {} not found in registry and no registration data provided",
                    token_id
                ));
            }
        }

        // Add the token to the user's list, initialization is handled by the service
        self.user_token_service
            .add_token(&caller.to_text(), token_id)?;

        Ok(self.list_tokens(caller))
    }

    pub fn add_tokens(
        &self,
        caller: &Principal,
        input: AddTokensInput,
    ) -> Result<(Vec<TokenDto>, bool, Option<UserPreference>), String> {
        let mut registry_updated = false;

        // First check if all tokens exist in the registry
        // if token doesn't exist, try to register it
        for (token_id, maybe_token_data) in input.tokens_enable.iter() {
            if self.token_registry_service.get_token(token_id).is_none() {
                // Token doesn't exist in registry, try to register it
                if let Some(token_data) = maybe_token_data {
                    if let Ok(_) = self
                        .token_registry_service
                        .register_token(RegisterTokenInput::from(token_data.clone()))
                    {
                        registry_updated = true;
                        ic_cdk::println!("Registered new token {}", token_id);
                    } else {
                        ic_cdk::println!("Failed to register token {}", token_id);
                    }
                } else {
                    ic_cdk::println!("Token {} not in registry and no data provided", token_id);
                }
            }
        }

        for (token_id, maybe_token_data) in input.tokens_disable.iter() {
            if self.token_registry_service.get_token(token_id).is_none() {
                // Token doesn't exist in registry, try to register it
                if let Some(token_data) = maybe_token_data {
                    if let Ok(_) = self
                        .token_registry_service
                        .register_token(RegisterTokenInput::from(token_data.clone()))
                    {
                        registry_updated = true;
                        ic_cdk::println!("Registered new token {}", token_id);
                    } else {
                        ic_cdk::println!("Failed to register token {}", token_id);
                    }
                } else {
                    ic_cdk::println!("Token {} not in registry and no data provided", token_id);
                }
            }
        }

        // Update registry version if we added new tokens
        if registry_updated {
            self.token_registry_service.increase_version();
        }

        // then sync the version, except token already exists, all token will go to disable list
        // Initialize user's token list with all registry tokens in disabled state
        self.user_token_service
            .sync_token_version(&caller.to_text())?;

        // Return the updated token list
        Ok(self.list_tokens(caller))
    }

    pub fn update_token_status(
        &self,
        caller: &Principal,
        input: UpdateTokenStatusInput,
    ) -> Result<(Vec<TokenDto>, bool, Option<UserPreference>), String> {
        let token_id = &input.token_id;

        // Check if token exists in registry
        if self.token_registry_service.get_token(token_id).is_none() {
            return Err(format!("Token {} not found in registry", token_id));
        }

        // Update the token's status, initialization is handled by the service
        if let Err(e) = self.user_token_service.update_token_status(
            &caller.to_text(),
            token_id,
            input.is_enabled,
        ) {
            return Err(e);
        }

        // Return the updated token list
        Ok(self.list_tokens(caller))
    }

    pub fn update_tokens_balance(
        &self,
        caller: &Principal,
        input: Vec<UpdateTokenBalanceInput>,
    ) -> Result<(), String> {
        let user_id = caller.to_text();

        // Convert input to Vec<(TokenId, u128)> format
        let updates: Vec<(TokenId, u128)> = input
            .iter()
            .filter_map(|token| {
                return Some((token.token_id.clone(), token.balance));
            })
            .collect();

        // Update token balances in bulk
        if !updates.is_empty() {
            self.user_token_service
                .update_bulk_balances(&user_id, updates);
        }

        Ok(())
    }

    pub fn reset_all_cache(&self, caller: &Principal) -> Result<(), String> {
        let user_id = caller.to_text();
        self.user_token_service.reset_cached_balances(&user_id);
        Ok(())
    }
}

// ==================== USER TOKENS API ====================

/// Lists all tokens for the current user
/// If the user's list is empty, returns tokens from the registry
/// Returns the list of tokens with balance information for enabled tokens
/// Also returns a flag indicating if the token list needs to be updated due to version changes
#[query]
pub fn list_tokens() -> Result<TokenListResponse, String> {
    let caller = ic_cdk::caller();
    let api = TokenApi::new();
    let (tokens, need_update_version, user_preference) = api.list_tokens(&caller);

    Ok(TokenListResponse {
        tokens,
        need_update_version,
        perference: user_preference,
    })
}

/// Adds a token to the current user's enable list
/// If the token doesn't exist in registry, it registers it first using the provided data
/// This method add token to user token list by default
/// Returns an error if the user is anonymous or if the token doesn't exist and no data was provided
#[update]
pub fn add_token(input: AddTokenInput) -> Result<TokenListResponse, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let api = TokenApi::new();

    let (tokens, need_update_version, perference) = api.add_token(&caller, input)?;

    Ok(TokenListResponse {
        tokens,
        need_update_version,
        perference,
    })
}

/// Adds multiple tokens at once to the current user's enable list
/// For each token, if it doesn't exist in registry, it registers it first using the provided data
/// Returns the updated list of tokens
/// Returns an error if the user is anonymous or if none of the tokens could be processed
#[update]
pub fn add_tokens(input: AddTokensInput) -> Result<TokenListResponse, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let api = TokenApi::new();
    let (tokens, need_update_version, perference) = api.add_tokens(&caller, input)?;

    Ok(TokenListResponse {
        tokens,
        need_update_version,
        perference,
    })
}

/// Updates a token's status (enable/disable) for the current user
/// Returns the updated list of tokens
/// Returns an error if the user is anonymous or if the token doesn't exist in the registry
#[update]
pub fn update_token_status(input: UpdateTokenStatusInput) -> Result<TokenListResponse, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let api = TokenApi::new();
    let (tokens, need_update_version, perference) = api.update_token_status(&caller, input)?;

    Ok(TokenListResponse {
        tokens,
        need_update_version,
        perference,
    })
}

/// Synchronize the user's token list with the registry
/// This will add any new tokens from the registry to the user's list
/// Returns an error if the user is anonymous
#[update]
pub fn sync_token_list() -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let user_token_service = UserTokenService::new();
    user_token_service.sync_token_version(&caller.to_string())
}

#[update]
pub fn update_token_balance(input: Vec<UpdateTokenBalanceInput>) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let api = TokenApi::new();
    api.update_tokens_balance(&caller, input)
}

#[query]
pub fn get_balance_cache(
    wallet: String,
) -> Result<std::collections::HashMap<std::string::String, u128>, String> {
    let user_token_service = UserTokenService::new();
    Ok(user_token_service.get_all_cached_balances(&wallet))
}

#[update]
pub fn reset_cache(wallet: String) -> Result<(), String> {
    let api = TokenApi::new();
    api.reset_all_cache(&Principal::from_text(wallet).unwrap())
}

#[query]
pub fn list_user_tokens(wallet: String) -> Result<TokenListResponse, String> {
    let caller = Principal::from_text(wallet).unwrap();
    let api = TokenApi::new();
    let (tokens, need_update_version, user_preference) = api.list_tokens(&caller);

    Ok(TokenListResponse {
        tokens,
        need_update_version,
        perference: user_preference,
    })
}
