// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    TokenId,
    error::CanisterError,
    user::{UserPreference, UserTokenList},
};

use crate::repository::{
    Repositories, token_registry::TokenRegistryRepository,
    token_registry_metadata::TokenRegistryMetadataRepository,
    user_preference::UserPreferenceRepository, user_token::UserTokenRepository,
};

pub struct UserTokenService<R: Repositories> {
    token_repository: UserTokenRepository<R::UserToken>,
    registry_repository: TokenRegistryRepository<R::TokenRegistry>,
    metadata_repository: TokenRegistryMetadataRepository<R::TokenRegistryMetadata>,
    user_preference_repository: UserPreferenceRepository<R::UserPreference>,
}

impl<R: Repositories> UserTokenService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            token_repository: repo.user_token(),
            registry_repository: repo.token_registry(),
            metadata_repository: repo.token_registry_metadata(),
            user_preference_repository: repo.user_preference(),
        }
    }

    /// Ensures the user has a token list initialized
    /// If the user doesn't have a token list, creates one with default settings
    /// # Arguments
    /// * `user_id` - The ID of the user to ensure token list for
    /// # Returns
    /// * `Ok(())` if the token list is initialized or already exists
    /// * `Err(CanisterError)` if there was an error initializing the token list
    fn ensure_token_list_initialized(&mut self, user_id: Principal) -> Result<(), CanisterError> {
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
    /// # Arguments
    /// * `user_id` - The ID of the user to add the token for
    /// * `token_id` - The ID of the token to add
    /// # Returns
    /// * `Ok(())` if the token was successfully added or already enabled
    /// * `Err(CanisterError)` if there was an error adding the token (e.g. token doesn't exist in registry)
    pub fn add_token(
        &mut self,
        user_id: Principal,
        token_id: TokenId,
    ) -> Result<(), CanisterError> {
        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Add the token to the user's list
        self.token_repository.add_token(user_id, token_id)
    }

    /// Add multiple tokens to the user's list
    /// Tokens that don't exist in the registry will be filtered out
    /// # Arguments
    /// * `user_id` - The ID of the user to add the tokens for
    /// * `token_ids` - The IDs of the tokens to add
    /// # Returns
    /// * `Ok(())` if the tokens were successfully added (or if the input list was empty)
    /// * `Err(CanisterError)` if there was an error adding the tokens (e.g. none of the tokens exist in the registry)
    pub fn add_tokens(
        &mut self,
        user_id: Principal,
        token_ids: Vec<TokenId>,
    ) -> Result<(), CanisterError> {
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
            return Err(CanisterError::HandleLogicError(
                "None of the provided tokens exist in the registry".to_string(),
            ));
        }

        // Add all valid tokens to the user's list
        self.token_repository
            .add_bulk_tokens(user_id, &valid_tokens)?;

        Ok(())
    }

    /// Update a token's status (enable/disable)
    /// This only swaps a token between the enable and disable lists
    /// # Arguments
    /// * `user_id` - The ID of the user to update the token for
    /// * `token_id` - The ID of the token to update
    /// * `is_enabled` - Whether the token should be enabled (true) or disabled (false)
    /// # Returns
    /// * `Ok(())` if the token was successfully updated
    /// * `Err(CanisterError)` if there was an error updating the token (e.g. token doesn't exist in registry, token is default and cannot be toggled)
    pub fn update_token_enable(
        &mut self,
        user_id: Principal,
        token_id: TokenId,
        is_enabled: bool,
    ) -> Result<(), CanisterError> {
        // Check if the updating token is a default token in the registry
        // if so, return an error as default tokens cannot be toggled
        let registry_token = self.registry_repository.get_token(&token_id);
        match registry_token {
            None => {
                return Err(CanisterError::NotFound(format!(
                    "Token with id '{token_id:?}' not found in registry"
                )));
            }
            Some(token) => {
                if token.enabled_by_default {
                    return Err(CanisterError::HandleLogicError(format!(
                        "Token with id '{token_id:?}' is default and cannot be toggled"
                    )));
                }
            }
        }

        // Ensure user has a token list initialized
        self.ensure_token_list_initialized(user_id)?;

        // Update the token's status
        self.token_repository
            .update_token(user_id, token_id, is_enabled)
    }

    /// Synchronize the user token list with the registry
    /// This will add any new tokens from the registry that are enabled_by_default
    /// to the user's enable list if they don't already exist there
    /// # Arguments
    /// * `user_id` - The ID of the user to synchronize the token list for
    /// # Returns
    /// * `Ok(())` if the token list was successfully synchronized
    /// * `Err(CanisterError)` if there was an error synchronizing the token list (e.g. failed to initialize token list, failed to update token list)
    pub fn sync_token_version(&mut self, user_id: Principal) -> Result<(), CanisterError> {
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
    /// # Arguments
    /// * `user_id` - The ID of the user to get the token list for
    /// # Returns
    /// * `Ok(UserTokenList)` if the token list was successfully retrieved
    /// * `Err(CanisterError)` if there was an error retrieving the token list (e.g. token list not initialized)
    pub fn get_token_list(&self, user_id: &Principal) -> Result<UserTokenList, CanisterError> {
        self.token_repository.list_tokens(user_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::{Repositories, tests::TestRepositories};
    use candid::Nat;
    use token_storage_types::token::{ChainTokenDetails, IcrcStandard, RegistryToken};

    fn fixture_of_token_id(ledger_id: Principal) -> TokenId {
        TokenId::IC { ledger_id }
    }

    fn fixture_of_registry_token(
        ledger_id: Principal,
        symbol: &str,
        enabled_by_default: bool,
    ) -> RegistryToken {
        RegistryToken {
            symbol: symbol.to_string(),
            name: format!("{symbol} Token"),
            decimals: 8,
            details: ChainTokenDetails::IC {
                ledger_id,
                index_id: None,
                fee: Nat::from(10u64),
                supported_standards: vec![IcrcStandard::ICRC1],
            },
            enabled_by_default,
            is_rune: None,
            rune_info: None,
        }
    }

    fn fixture_of_user_token_list(token_ids: Vec<TokenId>, version: u64) -> UserTokenList {
        UserTokenList {
            version,
            enable_list: token_ids.into_iter().collect(),
        }
    }

    #[test]
    fn it_should_fail_get_token_list_due_to_user_token_list_not_initialized() {
        // Arrange
        let repositories = TestRepositories::new();
        let user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();

        // Act
        let result = user_token_service.get_token_list(&user_id);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("user token list is not init")
        );
    }

    #[test]
    fn it_should_fail_add_tokens_due_to_no_tokens_existing_in_registry() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();
        let missing_token_id = fixture_of_token_id(Principal::management_canister());

        // Act
        let result = user_token_service.add_tokens(user_id, vec![missing_token_id]);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("None of the provided tokens exist in the registry")
        );
    }

    #[test]
    fn it_should_fail_update_token_enable_due_to_token_not_found_in_registry() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();
        let token_id = fixture_of_token_id(Principal::management_canister());

        // Act
        let result = user_token_service.update_token_enable(user_id, token_id, true);

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found in registry"));
    }

    #[test]
    fn it_should_fail_update_token_enable_due_to_default_token_cannot_be_toggled() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut registry_repository = repositories.token_registry();
        let mut user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();
        let ledger_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let default_token = fixture_of_registry_token(ledger_id, "ICP", true);
        let token_id = default_token.details.token_id();
        registry_repository.register_token(default_token).unwrap();

        // Act
        let result = user_token_service.update_token_enable(user_id, token_id, false);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("is default and cannot be toggled")
        );
    }

    #[test]
    fn it_should_do_add_token() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut registry_repository = repositories.token_registry();
        let mut metadata_repository = repositories.token_registry_metadata();
        let mut user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();
        let default_token = fixture_of_registry_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            true,
        );
        let extra_token = fixture_of_registry_token(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "ckBTC",
            false,
        );
        let extra_token_id = extra_token.details.token_id();
        registry_repository.register_token(default_token.clone()).unwrap();
        registry_repository.register_token(extra_token).unwrap();
        metadata_repository.increase_version(1);

        // Act
        let result = user_token_service.add_token(user_id, extra_token_id.clone());
        let token_list = user_token_service.get_token_list(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(token_list.version, 2);
        assert_eq!(token_list.enable_list.len(), 2);
        assert!(token_list.enable_list.contains(&default_token.details.token_id()));
        assert!(token_list.enable_list.contains(&extra_token_id));
    }

    #[test]
    fn it_should_do_add_tokens_with_only_valid_registry_tokens() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut registry_repository = repositories.token_registry();
        let mut metadata_repository = repositories.token_registry_metadata();
        let mut user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();
        let valid_token_1 = fixture_of_registry_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            false,
        );
        let valid_token_2 = fixture_of_registry_token(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "ckBTC",
            false,
        );
        let missing_token_id = fixture_of_token_id(Principal::management_canister());
        let valid_token_id_1 = valid_token_1.details.token_id();
        let valid_token_id_2 = valid_token_2.details.token_id();
        registry_repository.register_token(valid_token_1).unwrap();
        registry_repository.register_token(valid_token_2).unwrap();
        metadata_repository.increase_version(1);

        // Act
        let result = user_token_service.add_tokens(
            user_id,
            vec![
                valid_token_id_1.clone(),
                missing_token_id,
                valid_token_id_2.clone(),
            ],
        );
        let token_list = user_token_service.get_token_list(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(token_list.enable_list.len(), 2);
        assert!(token_list.enable_list.contains(&valid_token_id_1));
        assert!(token_list.enable_list.contains(&valid_token_id_2));
    }

    #[test]
    fn it_should_do_return_ok_when_adding_empty_token_list() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();

        // Act
        let result = user_token_service.add_tokens(user_id, vec![]);

        // Assert
        assert!(result.is_ok());
        assert!(user_token_service.get_token_list(&user_id).is_err());
    }

    #[test]
    fn it_should_do_disable_non_default_token() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut registry_repository = repositories.token_registry();
        let mut metadata_repository = repositories.token_registry_metadata();
        let mut user_token_repository = repositories.user_token();
        let mut user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();
        let token = fixture_of_registry_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            false,
        );
        let token_id = token.details.token_id();
        registry_repository.register_token(token.clone()).unwrap();
        metadata_repository.increase_version(1);
        user_token_repository
            .update_token_list(user_id, &fixture_of_user_token_list(vec![token_id.clone()], 2))
            .unwrap();

        // Act
        let result = user_token_service.update_token_enable(user_id, token_id.clone(), false);
        let token_list = user_token_service.get_token_list(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert!(!token_list.enable_list.contains(&token_id));
    }

    #[test]
    fn it_should_do_sync_token_version() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut registry_repository = repositories.token_registry();
        let mut metadata_repository = repositories.token_registry_metadata();
        let mut user_token_repository = repositories.user_token();
        let mut user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();
        let existing_enabled_token = fixture_of_registry_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            true,
        );
        let new_enabled_token = fixture_of_registry_token(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "ckBTC",
            true,
        );
        let disabled_token = fixture_of_registry_token(
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            "CHAT",
            false,
        );
        let existing_enabled_token_id = existing_enabled_token.details.token_id();
        let new_enabled_token_id = new_enabled_token.details.token_id();
        let disabled_token_id = disabled_token.details.token_id();
        registry_repository
            .register_token(existing_enabled_token)
            .unwrap();
        registry_repository.register_token(new_enabled_token).unwrap();
        registry_repository.register_token(disabled_token).unwrap();
        metadata_repository.increase_version(1);
        metadata_repository.increase_version(2);
        user_token_repository
            .update_token_list(
                user_id,
                &fixture_of_user_token_list(vec![existing_enabled_token_id.clone()], 1),
            )
            .unwrap();

        // Act
        let result = user_token_service.sync_token_version(user_id);
        let token_list = user_token_service.get_token_list(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(token_list.version, 3);
        assert!(token_list.enable_list.contains(&existing_enabled_token_id));
        assert!(token_list.enable_list.contains(&new_enabled_token_id));
        assert!(!token_list.enable_list.contains(&disabled_token_id));
    }

    #[test]
    fn it_should_do_get_token_list() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut user_token_repository = repositories.user_token();
        let user_token_service = UserTokenService::new(&repositories);
        let user_id = Principal::anonymous();
        let token_id = fixture_of_token_id(Principal::management_canister());
        let token_list = fixture_of_user_token_list(vec![token_id.clone()], 7);
        user_token_repository
            .update_token_list(user_id, &token_list)
            .unwrap();

        // Act
        let result = user_token_service.get_token_list(&user_id);

        // Assert
        assert!(result.is_ok());
        let stored_token_list = result.unwrap();
        assert_eq!(stored_token_list.version, 7);
        assert!(stored_token_list.enable_list.contains(&token_id));
    }
}
