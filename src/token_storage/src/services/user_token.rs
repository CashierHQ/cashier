// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{TokenId, user::UserPreference};

use crate::{
    repository::{
        balance_cache::{BalanceCacheRepository, ThreadlocalBalanceCacheRepositoryStorage}, token_registry::{ThreadlocalTokenRegistryRepositoryStorage, TokenRegistryRepository},
        token_registry_metadata::{ThreadlocalTokenRegistryMetadataRepositoryStorage, TokenRegistryMetadataRepository},
        user_preference::{ThreadlocalUserPreferenceRepositoryStorage, UserPreferenceRepository}, user_token::{ThreadlocalTokenRepositoryStorage, TokenRepository},
    },
    types::UserTokenList,
};

pub struct UserTokenService {
    token_repository: TokenRepository<ThreadlocalTokenRepositoryStorage>,
    registry_repository: TokenRegistryRepository<ThreadlocalTokenRegistryRepositoryStorage>,
    metadata_repository: TokenRegistryMetadataRepository<ThreadlocalTokenRegistryMetadataRepositoryStorage>,
    user_preference_repository: UserPreferenceRepository<ThreadlocalUserPreferenceRepositoryStorage>,
    balance_cache_repository: BalanceCacheRepository<ThreadlocalBalanceCacheRepositoryStorage>,
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

    /// Ensures the user has a token list initialized
    /// If the user doesn't have a token list, creates one with default settings
    fn ensure_token_list_initialized(&mut self, user_id: Principal) -> Result<(), String> {
        match self.token_repository.list_tokens(&user_id) {
            Ok(_) => Ok(()), // Token list already exists
            Err(_) => {
                // Initialize with registry tokens
                let registry_list = self.registry_repository.list_tokens();
                let mut user_token_list = UserTokenList::default();
                let user_preference = UserPreference::default();
                let version = self.metadata_repository.get().version;

                // Initialize with current registry tokens
                user_token_list.init_with_current_registry(registry_list, version)?;

                // Save the new token list
                self.token_repository
                    .update_token_list(user_id, &user_token_list)?;
                self.user_preference_repository
                    .update(user_id, user_preference);

                Ok(())
            }
        }
    }

    /// Add a single token to the user's list
    /// If the token is not in either list, it will be added to the enable list
    /// If the token is in the disable list, it will be moved to the enable list
    pub fn add_token(&mut self, user_id: Principal, token_id: TokenId) -> Result<(), String> {
        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Add the token to the user's list
        self.token_repository.add_token(user_id, token_id)
    }

    /// Add multiple tokens to the user's list
    /// Tokens that don't exist in the registry will be filtered out
    pub fn add_tokens(&mut self, user_id: Principal, token_ids: Vec<TokenId>) -> Result<(), String> {
        if token_ids.is_empty() {
            return Ok(());
        }

        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Filter tokens to only include those that exist in the registry
        let valid_tokens: Vec<TokenId> = token_ids
            .into_iter()
            .filter(|id| self.registry_repository.get_token(id).is_some())
            .collect();

        if valid_tokens.is_empty() {
            return Err("None of the provided tokens exist in the registry".to_string());
        }

        // Add all valid tokens to the user's list
        self.token_repository
            .add_bulk_tokens(user_id, &valid_tokens)?;

        Ok(())
    }

    /// Update a token's status (enable/disable)
    /// This only swaps a token between the enable and disable lists
    /// Returns an error if the token doesn't exist in the registry
    pub fn update_token_enable(
        &mut self,
        user_id: Principal,
        token_id: TokenId,
        is_enabled: bool,
    ) -> Result<(), String> {
        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Update the token's status
        self.token_repository
            .update_token(user_id, token_id, is_enabled)
    }

    /// Synchronize the user token list with the registry
    /// This will add any new tokens from the registry that are enabled_by_default
    /// to the user's enable list if they don't already exist there
    pub fn sync_token_version(&mut self, user_id: Principal) -> Result<(), String> {
        let _ = self.ensure_token_list_initialized(user_id);

        // Get the user's token list
        let mut user_token_list = self
            .token_repository
            .list_tokens(&user_id)
            .unwrap_or_default();

        // Get the registry metadata to check version
        let registry_metadata = self.metadata_repository.get();

        // If versions match, no need to sync
        if user_token_list.version >= registry_metadata.version {
            return Ok(());
        }

        // Get all tokens from the registry
        let registry_tokens = self.registry_repository.list_tokens();

        // Loop through registry tokens and add new ones that are enabled_by_default
        for token in registry_tokens {
            // Skip tokens that are already in the user's enable list
            if user_token_list
                .enable_list
                .contains(&token.details.token_id())
            {
                continue;
            }

            // For new tokens, add to enable list only if enabled_by_default is true
            if token.enabled_by_default {
                user_token_list.enable_list.insert(token.details.token_id());
            }
            // If enabled_by_default is false, just ignore it (don't add to enable list)
        }

        // Update the user token list version to match registry
        user_token_list.version = registry_metadata.version;

        // Save the updated user token list
        self.token_repository
            .update_token_list(user_id, &user_token_list)
    }

    /// Get the user token list directly
    /// This gives access to the raw UserTokenList structure with version info
    pub fn get_token_list(&self, user_id: &Principal) -> Result<UserTokenList, String> {
        self.token_repository.list_tokens(user_id)
    }

    /// Update balances for multiple tokens at once
    pub fn update_bulk_balances(&mut self, user_id: Principal, updates: Vec<(TokenId, u128)>) {
        if !updates.is_empty() {
            self.balance_cache_repository
                .update_bulk_balances(user_id, updates);
        }
    }

    /// Get all balances for a user
    pub fn get_all_user_balances(
        &self,
        user_id: &Principal,
    ) -> std::collections::HashMap<TokenId, u128> {
        self.balance_cache_repository
            .get_all_balances(user_id)
            .into_iter()
            .collect()
    }
}
