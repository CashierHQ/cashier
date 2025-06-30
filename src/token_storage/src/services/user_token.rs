// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use crate::{
    repository::{
        balance_cache::BalanceCacheRepository, token_registry::TokenRegistryRepository,
        token_registry_metadata::TokenRegistryMetadataRepository,
        user_preference::UserPreferenceRepository, user_token::TokenRepository,
    },
    types::{TokenDto, TokenId, UserPreference, UserTokenList},
};

pub struct UserTokenService {
    token_repository: TokenRepository,
    registry_repository: TokenRegistryRepository,
    metadata_repository: TokenRegistryMetadataRepository,
    user_preference_repository: UserPreferenceRepository,
    balance_cache_repository: BalanceCacheRepository,
}

impl Default for UserTokenService {
    fn default() -> Self {
        Self::new()
    }
}

impl UserTokenService {
    pub fn new() -> Self {
        Self {
            token_repository: TokenRepository::new(),
            registry_repository: TokenRegistryRepository::new(),
            metadata_repository: TokenRegistryMetadataRepository::new(),
            user_preference_repository: UserPreferenceRepository::new(),
            balance_cache_repository: BalanceCacheRepository::new(),
        }
    }

    pub fn list_tokens(&self, user_id: &str) -> Vec<TokenDto> {
        // Try to get the user's token list
        let user_token_list = self.token_repository.list_tokens(user_id).unwrap_or_default();

        self.convert_to_token_dtos(user_id, &user_token_list)
    }

    /// Convert UserTokenList to a vector of TokenDto
    /// This will include balance information for tokens in the enable_list
    /// Tokens in disable_list will have balance of 0
    pub fn convert_to_token_dtos(
        &self,
        user_id: &str,
        user_token_list: &UserTokenList,
    ) -> Vec<TokenDto> {
        let mut result = Vec::new();

        // Collect all token IDs (both enabled and disabled)
        let all_token_ids: Vec<TokenId> = user_token_list
            .enable_list
            .iter()
            .chain(user_token_list.disable_list.iter())
            .cloned()
            .collect();

        if all_token_ids.is_empty() {
            return result;
        }

        // Get balances for enabled tokens
        let balances = if !user_token_list.enable_list.is_empty() {
            let balances_vec = self.balance_cache_repository.get_all_balances(user_id);
            balances_vec.into_iter().collect()
        } else {
            std::collections::HashMap::new()
        };

        // Fetch all registry tokens in batch for better performance
        let registry_tokens = self.registry_repository.get_tokens_batch(&all_token_ids);

        // Convert each token to TokenDto
        for token_id in all_token_ids {
            // Get token registry information
            if let Some(registry_token) = registry_tokens.get(&token_id) {
                let is_enabled = user_token_list.enable_list.contains(&token_id);

                // Only include balance for enabled tokens
                let balance = if is_enabled {
                    balances.get(&token_id).cloned()
                } else {
                    None // Disabled tokens have no balance
                };

                result.push(TokenDto {
                    id: token_id,
                    icrc_ledger_id: registry_token.icrc_ledger_id,
                    icrc_index_id: registry_token.icrc_index_id,
                    symbol: registry_token.symbol.clone(),
                    name: registry_token.name.clone(),
                    decimals: registry_token.decimals,
                    chain: registry_token.chain.to_str(),
                    enabled: is_enabled,
                    balance,
                    fee: registry_token.fee.clone(),
                });
            }
        }

        result
    }

    /// Ensures the user has a token list initialized
    /// If the user doesn't have a token list, creates one with default settings
    fn ensure_token_list_initialized(&self, user_id: &str) -> Result<(), String> {
        match self.token_repository.list_tokens(user_id) {
            Ok(_) => Ok(()), // Token list already exists
            Err(_) => {
                // Initialize with registry tokens
                let default_token_list = self.registry_repository.list_tokens();
                let mut user_token_list = UserTokenList::default();
                let user_preference = UserPreference::default();
                let version = self.metadata_repository.get().version;

                // Initialize with current registry tokens
                user_token_list.init_with_current_registry(default_token_list, version)?;

                // Save the new token list
                self.token_repository
                    .update_token_list(user_id, &user_token_list)?;
                self.user_preference_repository
                    .update(user_id.to_string(), user_preference);

                Ok(())
            }
        }
    }

    /// Add a single token to the user's list
    /// If the token is not in either list, it will be added to the enable list
    /// If the token is in the disable list, it will be moved to the enable list
    pub fn add_token(&self, user_id: &str, token_id: &TokenId) -> Result<(), String> {
        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Add the token to the user's list
        self.token_repository.add_token(user_id, token_id)
    }

    /// Add multiple tokens to the user's list
    /// Tokens that don't exist in the registry will be filtered out
    pub fn add_tokens(&self, user_id: &str, token_ids: &[TokenId]) -> Result<Vec<TokenId>, String> {
        if token_ids.is_empty() {
            return Ok(vec![]);
        }

        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Filter tokens to only include those that exist in the registry
        let valid_tokens: Vec<TokenId> = token_ids
            .iter()
            .filter(|id| self.registry_repository.get_token(id).is_some())
            .cloned()
            .collect();

        if valid_tokens.is_empty() {
            return Err("None of the provided tokens exist in the registry".to_string());
        }

        // Add all valid tokens to the user's list
        self.token_repository
            .add_bulk_tokens(user_id, &valid_tokens)?;

        // Return the list of tokens that were successfully added
        Ok(valid_tokens)
    }

    pub fn add_disable_token(&self, user_id: &str, token_id: &TokenId) -> Result<(), String> {
        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Add the token to the user's disable list
        self.token_repository.add_disable_token(user_id, token_id)
    }

    /// Update a token's status (enable/disable)
    /// This only swaps a token between the enable and disable lists
    /// Returns an error if the token doesn't exist in the registry
    pub fn update_token_status(
        &self,
        user_id: &str,
        token_id: &TokenId,
        is_enabled: bool,
    ) -> Result<(), String> {
        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Update the token's status
        self.token_repository
            .swap_token_enable(user_id, is_enabled, token_id)
    }

    /// Synchronize the user token list with the registry
    /// This will add any new tokens from the registry to the user's list
    /// If a token is in the user's disable list, it will remain there even if enabled_by_default is true
    pub fn sync_token_version(&self, user_id: &str) -> Result<(), String> {
        let _ = self.ensure_token_list_initialized(user_id);

        // Get the user's token list
        let mut user_token_list = self.token_repository.list_tokens(user_id).unwrap_or_default();

        // Get the registry metadata to check version
        let registry_metadata = self.metadata_repository.get();

        // If versions match, no need to sync
        if user_token_list.version >= registry_metadata.version {
            return Ok(());
        }

        // Get all tokens from the registry
        let registry_tokens = self.registry_repository.list_tokens();

        // Loop through registry tokens and add new ones to user's list
        for token in registry_tokens {
            // Skip tokens that are already in either the enable or disable list
            if user_token_list.enable_list.contains(&token.id)
                || user_token_list.disable_list.contains(&token.id)
            {
                continue;
            }

            // For new tokens, add to enable list if enabled_by_default is true
            if token.enabled_by_default {
                user_token_list.enable_list.insert(token.id);
            } else {
                user_token_list.disable_list.insert(token.id);
            }
        }

        // Update the user token list version to match registry
        user_token_list.version = registry_metadata.version;

        // Save the updated user token list
        self.token_repository
            .update_token_list(user_id, &user_token_list)
    }

    /// Get the user token list directly
    /// This gives access to the raw UserTokenList structure with version info
    pub fn get_token_list(&self, user_id: &str) -> Result<UserTokenList, String> {
        self.token_repository.list_tokens(user_id)
    }

    /// Update balances for multiple tokens at once
    pub fn update_bulk_balances(&self, user_id: &str, updates: Vec<(TokenId, u128)>) {
        if !updates.is_empty() {
            self.balance_cache_repository
                .update_bulk_balances(user_id, updates);
        }
    }

    pub fn get_bulk_balances(
        &self,
        user_id: &str,
        token_ids: Vec<TokenId>,
    ) -> std::collections::HashMap<TokenId, u128> {
        self.balance_cache_repository
            .get_balances_batch(user_id, token_ids)
    }

    pub fn get_all_cached_balances(
        &self,
        user_id: &str,
    ) -> std::collections::HashMap<std::string::String, u128> {
        let balances_vec = self.balance_cache_repository.get_all_balances(user_id);
        balances_vec.into_iter().collect()
    }

    pub fn reset_cached_balances(&self, user_id: &str) {
        self.balance_cache_repository.reset_balances(user_id);
    }
}
