// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    IndexId, TokenId,
    error::CanisterError,
    token::{
        ChainTokenDetails, IcrcStandard, IcrcStandards, RegistryToken, RuneInfo, TokenDto,
        TokenListResponse, TokenRegistryMetadata,
    },
    user::{UserPreference, UserTokenList},
};

use crate::{
    ext::traits::TokenMetadataFetcher,
    repository::{
        Repositories, token_registry::TokenRegistryRepository,
        token_registry_metadata::TokenRegistryMetadataRepository,
    },
    token::validator::validate_rune_input,
};

pub struct TokenRegistryService<R: Repositories> {
    pub registry_repository: TokenRegistryRepository<R::TokenRegistry>,
    pub metadata_repository: TokenRegistryMetadataRepository<R::TokenRegistryMetadata>,
}

impl<R: Repositories> TokenRegistryService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            registry_repository: repo.token_registry(),
            metadata_repository: repo.token_registry_metadata(),
        }
    }

    /// Get the current registry metadata containing the version
    /// # Returns
    /// * `TokenRegistryMetadata` - The current metadata of the token registry
    pub fn get_metadata(&self) -> TokenRegistryMetadata {
        self.metadata_repository.get()
    }

    /// Get a token from the registry by ID
    /// # Arguments
    /// * `token_id` - The ID of the token to retrieve
    /// # Returns
    /// * `Option<RegistryToken>` - The token if found, or `None` if not found
    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        self.registry_repository.get_token(token_id)
    }

    /// Build the token list response for a specific caller
    /// # Arguments
    /// * `caller` - The principal of the caller
    /// * `user_preferences` - The user's preferences, if available
    /// * `user_token_list` - The user's token list, if available
    /// # Returns
    /// * `TokenListResponse` - The token list response tailored to the caller
    pub fn list_tokens(
        &self,
        caller: Principal,
        user_preferences: Option<UserPreference>,
        user_token_list: Option<UserTokenList>,
    ) -> TokenListResponse {
        let registry_tokens = self.registry_repository.list_tokens();
        let registry_metadata = self.get_metadata();

        if caller == Principal::anonymous() {
            return TokenListResponse {
                tokens: registry_tokens.into_iter().map(TokenDto::from).collect(),
                need_update_version: false,
                perference: None,
            };
        }

        match user_token_list {
            Some(list) => {
                let need_update_version = list.version < registry_metadata.version;

                if list.enable_list.is_empty() {
                    TokenListResponse {
                        tokens: registry_tokens.into_iter().map(TokenDto::from).collect(),
                        need_update_version: true,
                        perference: user_preferences,
                    }
                } else {
                    let mut filtered_tokens = Vec::new();
                    let mut seen_token_ids = std::collections::HashSet::new();

                    for token_id in list.enable_list {
                        if let Some(registry_token) = registry_tokens
                            .iter()
                            .find(|token| token.details.token_id() == token_id)
                            && seen_token_ids.insert(registry_token.details.token_id())
                        {
                            let mut token_dto = TokenDto::from(registry_token.clone());
                            token_dto.enabled = true;
                            filtered_tokens.push(token_dto);
                        }
                    }

                    for registry_token in &registry_tokens {
                        let token_id = registry_token.details.token_id();
                        if !seen_token_ids.contains(&token_id)
                            && seen_token_ids.insert(token_id.clone())
                        {
                            filtered_tokens.push(TokenDto::from(registry_token.clone()));
                        }
                    }

                    TokenListResponse {
                        tokens: filtered_tokens,
                        need_update_version,
                        perference: user_preferences,
                    }
                }
            }
            None => TokenListResponse {
                tokens: registry_tokens.into_iter().map(TokenDto::from).collect(),
                need_update_version: true,
                perference: user_preferences,
            },
        }
    }

    /// Register a new token in the registry
    /// # Arguments
    /// * `input` - The token to register
    /// * `index_id` - Optional index ID for IC tokens
    /// * `is_rune` - Whether the token is a rune
    /// * `rune_info` - Information about the rune, if applicable
    /// * `updated_at` - The timestamp of the registration
    /// * `token_metadata_fetcher` - The fetcher for retrieving token metadata
    /// # Returns
    /// * `Ok(TokenId)` - The ID of the registered token if successful
    /// * `Err(CanisterError)` - An error if the registration failed
    pub async fn register_new_token<F>(
        &mut self,
        input: TokenId,
        index_id: Option<IndexId>,
        is_rune: Option<bool>,
        rune_info: Option<RuneInfo>,
        updated_at: u64,
        token_metadata_fetcher: &F,
    ) -> Result<TokenId, CanisterError>
    where
        F: TokenMetadataFetcher,
    {
        validate_rune_input(is_rune, &rune_info)?;
        match input {
            TokenId::IC { ledger_id } => {
                // Fetch required fields concurrently (these MUST succeed)
                let token_metadata = token_metadata_fetcher
                    .fetch_token_metadata(ledger_id)
                    .await?;

                // Fetch standards separately — optional, default to [ICRC1] on failure
                let supported_standards = token_metadata_fetcher
                    .icrc10_supported_standards(ledger_id)
                    .await
                    .map(|r| IcrcStandards::from(r).0)
                    .unwrap_or_else(|_| vec![IcrcStandard::ICRC1]);

                let registry_token = RegistryToken {
                    symbol: token_metadata.symbol,
                    name: token_metadata.name,
                    decimals: token_metadata.decimals,
                    details: ChainTokenDetails::IC {
                        ledger_id,
                        index_id,
                        fee: token_metadata.fee,
                        supported_standards,
                    },
                    enabled_by_default: false,
                    is_rune,
                    rune_info,
                };

                let token_id = registry_token.details.token_id();
                let is_new_token = !self.registry_repository.contains(&token_id);

                let registered_token_id =
                    self.registry_repository.register_token(registry_token)?;

                if is_new_token {
                    self.metadata_repository.increase_version(updated_at);
                }

                Ok(registered_token_id)
            }
        }
    }

    /// Register a new token in the registry
    /// # Arguments
    /// * `input` - The token to update
    /// * `timestamp` - The timestamp of the update
    /// * `token_metadata_fetcher` - The fetcher for retrieving token metadata
    /// # Returns
    /// * `Ok(TokenId)` - The ID of the updated token if successful
    /// * `Err(CanisterError)` - An error if the update failed (e.g. token not found, failed to fetch token metadata)
    #[allow(dead_code)]
    pub async fn update_token_metadata<F>(
        &mut self,
        input: TokenId,
        timestamp: u64,
        token_metadata_fetcher: &F,
    ) -> Result<TokenId, CanisterError>
    where
        F: TokenMetadataFetcher,
    {
        let current_record = self.get_token(&input);

        let Some(mut current_record) = current_record else {
            return Err(CanisterError::NotFound(format!(
                "Token with id '{input:?}' not found in registry"
            )));
        };

        match input {
            TokenId::IC { ledger_id } => {
                // Fetch required fields concurrently (these MUST succeed)
                let token_metadata = token_metadata_fetcher
                    .fetch_token_metadata(ledger_id)
                    .await?;

                // Fetch standards separately — optional, default to [ICRC1] on failure
                let supported_standards = token_metadata_fetcher
                    .icrc10_supported_standards(ledger_id)
                    .await
                    .map(|r| IcrcStandards::from(r).0)
                    .unwrap_or_else(|_| vec![IcrcStandard::ICRC1]);

                current_record.symbol = token_metadata.symbol;
                current_record.name = token_metadata.name;
                current_record.decimals = token_metadata.decimals;
                current_record.details = ChainTokenDetails::IC {
                    ledger_id,
                    index_id: current_record.details.index_id(),
                    fee: token_metadata.fee,
                    supported_standards,
                };

                let token_id = self.registry_repository.register_token(current_record)?;
                self.metadata_repository.increase_version(timestamp);
                Ok(token_id)
            }
        }
    }

    /// Add multiple tokens in bulk, increasing the version only once if any new token is added
    /// # Arguments
    /// * `tokens` - The list of tokens to add
    /// * `timestamp` - The timestamp of the update
    /// # Returns
    /// * `Ok(Vec<TokenId>)` - The IDs of the registered tokens if successful
    /// * `Err(CanisterError)` - An error if the registration failed
    pub fn add_bulk_tokens(
        &mut self,
        tokens: Vec<RegistryToken>,
        updated_at: u64,
    ) -> Result<Vec<TokenId>, CanisterError> {
        let mut token_ids = Vec::new();
        let mut any_new_tokens = false;

        // First pass: check if any tokens are new
        for input in &tokens {
            let is_new = !self.registry_repository.contains(&input.details.token_id());
            if is_new {
                any_new_tokens = true;
                break;
            }
        }

        // Second pass: register all tokens
        for input in tokens {
            let token_id = self.registry_repository.register_token(input)?;
            token_ids.push(token_id);
        }

        if any_new_tokens {
            self.metadata_repository.increase_version(updated_at);
        }

        Ok(token_ids)
    }

    /// Update supported standards for a token (admin override)
    /// # Arguments
    /// * `token_id` - The ID of the token to update
    /// * `supported_standards` - The new list of supported standards for the token
    /// * `timestamp` - The timestamp of the update
    /// # Returns
    /// * `Ok(())` - If the update was successful
    /// * `Err(CanisterError)` - An error if the update failed (e.g. token not found)
    pub fn update_token_standards(
        &mut self,
        token_id: TokenId,
        supported_standards: Vec<IcrcStandard>,
        updated_at: u64,
    ) -> Result<(), CanisterError> {
        let Some(mut token) = self.registry_repository.get_token(&token_id) else {
            return Err(CanisterError::NotFound(format!(
                "Token with id '{token_id:?}' not found in registry"
            )));
        };

        match &mut token.details {
            ChainTokenDetails::IC {
                supported_standards: current,
                ..
            } => {
                *current = supported_standards;
            }
        }

        self.registry_repository.register_token(token)?;
        self.metadata_repository.increase_version(updated_at);
        Ok(())
    }

    /// Delete all tokens from the registry
    /// # Returns
    /// * `Ok(())` if the tokens were successfully deleted
    /// * `Err(CanisterError)` if the tokens could not be deleted
    pub fn delete_all(&mut self) -> Result<(), CanisterError> {
        self.registry_repository.delete_all()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{ext::icrc::MockTokenMetadataFetcher, repository::tests::TestRepositories};
    use candid::{Nat, Principal};
    use token_storage_types::token::{SupportedStandardRecord, TokenMetadata};

    const TEST_TIMESTAMP: u64 = 1_234_567_890;

    fn fixture_of_token(
        ledger_id: Principal,
        symbol: &str,
        supported_standards: Vec<IcrcStandard>,
    ) -> RegistryToken {
        RegistryToken {
            symbol: symbol.to_string(),
            name: format!("{symbol} Token"),
            decimals: 8,
            details: ChainTokenDetails::IC {
                ledger_id,
                index_id: None,
                fee: Nat::from(10u64),
                supported_standards,
            },
            enabled_by_default: false,
            is_rune: None,
            rune_info: None,
        }
    }

    fn fixture_of_token_metadata(symbol: &str) -> TokenMetadata {
        TokenMetadata {
            name: format!("{symbol} Token"),
            fee: Nat::from(10u64),
            decimals: 8,
            symbol: symbol.to_string(),
        }
    }

    fn fixture_of_supported_standard_records(names: Vec<&str>) -> Vec<SupportedStandardRecord> {
        names
            .into_iter()
            .map(|name| SupportedStandardRecord {
                name: name.to_string(),
                url: format!("https://example.com/{name}"),
            })
            .collect()
    }

    fn fixture_of_rune_info() -> RuneInfo {
        RuneInfo {
            rune_id: "UNCOMMON•GOODS".to_string(),
            token_id: "omnity-rune-token-id".to_string(),
        }
    }

    fn fixture_of_user_preference() -> UserPreference {
        UserPreference::default()
    }

    #[tokio::test]
    async fn it_should_fail_register_new_token_due_to_invalid_rune_input() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let token_metadata_fetcher = MockTokenMetadataFetcher::new(
            Ok(fixture_of_token_metadata("ICP")),
            Ok(fixture_of_supported_standard_records(vec!["ICRC-1"])),
        );

        // Act
        let result = service
            .register_new_token(
                token_id.clone(),
                None,
                Some(true),
                None,
                TEST_TIMESTAMP,
                &token_metadata_fetcher,
            )
            .await;

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("rune_info is required when is_rune is true")
        );
        assert!(service.get_token(&token_id).is_none());
        assert_eq!(service.get_metadata().version, 1);
        assert_eq!(service.get_metadata().last_updated, 0);
    }

    #[tokio::test]
    async fn it_should_fail_register_new_token_due_to_token_metadata_fetch_failure() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let token_metadata_fetcher = MockTokenMetadataFetcher::new(
            Err(CanisterError::CanisterCallError {
                method: "icrc1_name".to_string(),
                canister_id: ledger_id.to_string(),
                message: "failed".to_string(),
            }),
            Ok(fixture_of_supported_standard_records(vec!["ICRC-1"])),
        );

        // Act
        let result = service
            .register_new_token(
                token_id.clone(),
                None,
                None,
                None,
                TEST_TIMESTAMP,
                &token_metadata_fetcher,
            )
            .await;

        // Assert
        assert!(result.is_err());
        assert!(service.get_token(&token_id).is_none());
        assert_eq!(service.get_metadata().version, 1);
        assert_eq!(service.get_metadata().last_updated, 0);
    }

    #[tokio::test]
    async fn it_should_fail_update_token_metadata_due_to_token_not_found() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let token_metadata_fetcher = MockTokenMetadataFetcher::new(
            Ok(fixture_of_token_metadata("ckBTC")),
            Ok(fixture_of_supported_standard_records(vec!["ICRC-1"])),
        );

        // Act
        let result = service
            .update_token_metadata(token_id.clone(), TEST_TIMESTAMP, &token_metadata_fetcher)
            .await;

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("not found in registry")
        );
        assert_eq!(service.get_metadata().version, 1);
        assert_eq!(service.get_metadata().last_updated, 0);
    }

    #[tokio::test]
    async fn it_should_fail_update_token_metadata_due_to_token_metadata_fetch_failure() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let initial_token = fixture_of_token(ledger_id, "ICP", vec![IcrcStandard::ICRC1]);
        service
            .add_bulk_tokens(vec![initial_token], TEST_TIMESTAMP)
            .unwrap();
        let token_metadata_fetcher = MockTokenMetadataFetcher::new(
            Err(CanisterError::CanisterCallError {
                method: "icrc1_name".to_string(),
                canister_id: ledger_id.to_string(),
                message: "failed".to_string(),
            }),
            Ok(fixture_of_supported_standard_records(vec!["ICRC-1"])),
        );

        // Act
        let result = service
            .update_token_metadata(
                token_id.clone(),
                TEST_TIMESTAMP + 1,
                &token_metadata_fetcher,
            )
            .await;

        // Assert
        assert!(result.is_err());
        let stored_token = service
            .get_token(&token_id)
            .expect("token should remain unchanged after failed update");
        assert_eq!(stored_token.symbol, "ICP");
        assert_eq!(stored_token.name, "ICP Token");
        assert_eq!(service.get_metadata().version, 2);
        assert_eq!(service.get_metadata().last_updated, TEST_TIMESTAMP);
    }

    #[test]
    fn it_should_fail_update_token_standards_due_to_unknown_token() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let unknown_token_id = TokenId::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };

        // Act
        let result = service.update_token_standards(
            unknown_token_id,
            vec![IcrcStandard::ICRC1],
            TEST_TIMESTAMP,
        );

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("not found in registry")
        );
    }

    #[test]
    fn it_should_do_list_tokens_for_anonymous_caller() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token_1 = fixture_of_token(
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_2 = fixture_of_token(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "ckBTC",
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        );
        service
            .add_bulk_tokens(vec![token_1.clone(), token_2.clone()], TEST_TIMESTAMP)
            .unwrap();

        // Act
        let result = service.list_tokens(Principal::anonymous(), None, None);

        // Assert
        assert_eq!(result.tokens.len(), 2);
        assert!(!result.need_update_version);
        assert!(result.perference.is_none());
        assert!(
            result
                .tokens
                .iter()
                .any(|token| token.id == token_1.details.token_id())
        );
        assert!(
            result
                .tokens
                .iter()
                .any(|token| token.id == token_2.details.token_id())
        );
    }

    #[test]
    fn it_should_do_list_tokens_due_to_missing_user_token_list() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token = fixture_of_token(
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_id = token.details.token_id();
        let user_preference = fixture_of_user_preference();
        service
            .add_bulk_tokens(vec![token], TEST_TIMESTAMP)
            .unwrap();

        // Act
        let result = service.list_tokens(
            Principal::management_canister(),
            Some(user_preference.clone()),
            None,
        );

        // Assert
        assert_eq!(result.tokens.len(), 1);
        assert!(result.need_update_version);
        assert_eq!(result.perference, Some(user_preference));
        assert_eq!(result.tokens[0].id, token_id);
    }

    #[test]
    fn it_should_do_list_tokens_due_to_empty_enabled_list() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token = fixture_of_token(
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_id = token.details.token_id();
        let user_preference = fixture_of_user_preference();
        service
            .add_bulk_tokens(vec![token], TEST_TIMESTAMP)
            .unwrap();

        // Act
        let result = service.list_tokens(
            Principal::management_canister(),
            Some(user_preference.clone()),
            Some(UserTokenList {
                version: 2,
                enable_list: std::collections::HashSet::new(),
            }),
        );

        // Assert
        assert_eq!(result.tokens.len(), 1);
        assert!(result.need_update_version);
        assert_eq!(result.perference, Some(user_preference));
        assert_eq!(result.tokens[0].id, token_id);
    }

    #[test]
    fn it_should_do_list_tokens_with_enabled_tokens_first() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token_1 = fixture_of_token(
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_2 = fixture_of_token(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "ckBTC",
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        );
        let token_1_id = token_1.details.token_id();
        let token_2_id = token_2.details.token_id();
        let user_preference = fixture_of_user_preference();
        service
            .add_bulk_tokens(vec![token_1, token_2], TEST_TIMESTAMP)
            .unwrap();

        // Act
        let result = service.list_tokens(
            Principal::management_canister(),
            Some(user_preference.clone()),
            Some(UserTokenList {
                version: 1,
                enable_list: vec![token_2_id.clone()].into_iter().collect(),
            }),
        );

        // Assert
        assert_eq!(result.tokens.len(), 2);
        assert!(result.need_update_version);
        assert_eq!(result.perference, Some(user_preference));
        assert_eq!(result.tokens[0].id, token_2_id);
        assert!(result.tokens[0].enabled);
        assert_eq!(result.tokens[1].id, token_1_id);
        assert!(!result.tokens[1].enabled);
    }

    #[test]
    fn it_should_do_list_tokens_without_needing_update_when_user_token_list_version_matches_registry()
     {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token = fixture_of_token(
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_id = token.details.token_id();
        let user_preference = fixture_of_user_preference();
        service
            .add_bulk_tokens(vec![token], TEST_TIMESTAMP)
            .unwrap();

        // Act
        let result = service.list_tokens(
            Principal::management_canister(),
            Some(user_preference.clone()),
            Some(UserTokenList {
                version: 2,
                enable_list: vec![token_id.clone()].into_iter().collect(),
            }),
        );

        // Assert
        assert_eq!(result.tokens.len(), 1);
        assert!(!result.need_update_version);
        assert_eq!(result.perference, Some(user_preference));
        assert_eq!(result.tokens[0].id, token_id);
        assert!(result.tokens[0].enabled);
    }

    #[test]
    fn it_should_do_list_tokens_with_none_user_preference_for_non_anonymous_caller() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token = fixture_of_token(
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        service
            .add_bulk_tokens(vec![token], TEST_TIMESTAMP)
            .unwrap();

        // Act
        let result = service.list_tokens(Principal::management_canister(), None, None);

        // Assert
        assert_eq!(result.tokens.len(), 1);
        assert!(result.need_update_version);
        assert!(result.perference.is_none());
    }

    #[test]
    fn it_should_do_get_metadata() {
        // Arrange
        let repo = TestRepositories::new();
        let service = TokenRegistryService::new(&repo);

        // Act
        let metadata = service.get_metadata();

        // Assert
        assert_eq!(metadata.version, 1);
    }

    #[test]
    fn it_should_do_return_none_for_unknown_token() {
        // Arrange
        let repo = TestRepositories::new();
        let service = TokenRegistryService::new(&repo);
        let token_id = TokenId::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };

        // Act
        let result = service.get_token(&token_id);

        // Assert
        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn it_should_do_register_new_token() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let token_metadata_fetcher = MockTokenMetadataFetcher::new(
            Ok(fixture_of_token_metadata("ICP")),
            Ok(fixture_of_supported_standard_records(vec![
                "ICRC-1", "ICRC-2",
            ])),
        );

        // Act
        let result = service
            .register_new_token(
                token_id.clone(),
                None,
                Some(true),
                Some(fixture_of_rune_info()),
                TEST_TIMESTAMP,
                &token_metadata_fetcher,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), token_id.clone());
        let registered_token = service
            .get_token(&token_id)
            .expect("token should be registered");
        assert_eq!(registered_token.symbol, "ICP");
        assert_eq!(registered_token.name, "ICP Token");
        assert_eq!(registered_token.decimals, 8);
        assert_eq!(registered_token.is_rune, Some(true));
        assert_eq!(registered_token.rune_info, Some(fixture_of_rune_info()));
        let ChainTokenDetails::IC {
            supported_standards,
            ..
        } = registered_token.details;
        assert_eq!(
            supported_standards,
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2]
        );
        assert_eq!(service.get_metadata().version, 2);
        assert_eq!(service.get_metadata().last_updated, TEST_TIMESTAMP);
    }

    #[tokio::test]
    async fn it_should_do_register_existing_token_without_updating_metadata_version() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let initial_fetcher = MockTokenMetadataFetcher::new(
            Ok(fixture_of_token_metadata("ICP")),
            Ok(fixture_of_supported_standard_records(vec!["ICRC-1"])),
        );
        let updated_fetcher = MockTokenMetadataFetcher::new(
            Ok(TokenMetadata {
                name: "Internet Computer".to_string(),
                fee: Nat::from(100u64),
                decimals: 18,
                symbol: "NEWICP".to_string(),
            }),
            Ok(fixture_of_supported_standard_records(vec![
                "ICRC-1", "ICRC-2",
            ])),
        );
        service
            .register_new_token(
                token_id.clone(),
                None,
                None,
                None,
                TEST_TIMESTAMP,
                &initial_fetcher,
            )
            .await
            .unwrap();
        let version_before = service.get_metadata().version;
        let last_updated_before = service.get_metadata().last_updated;

        // Act
        let result = service
            .register_new_token(
                token_id.clone(),
                None,
                None,
                None,
                TEST_TIMESTAMP + 1,
                &updated_fetcher,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let updated_token = service
            .get_token(&token_id)
            .expect("token should still exist after re-register");
        assert_eq!(updated_token.symbol, "NEWICP");
        assert_eq!(updated_token.name, "Internet Computer");
        assert_eq!(updated_token.decimals, 18);
        assert_eq!(service.get_metadata().version, version_before);
        assert_eq!(service.get_metadata().last_updated, last_updated_before);
    }

    #[tokio::test]
    async fn it_should_do_register_new_token_with_default_icrc1_due_to_supported_standards_fetch_failure()
     {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let token_metadata_fetcher = MockTokenMetadataFetcher::new(
            Ok(fixture_of_token_metadata("ckBTC")),
            Err(CanisterError::UnknownError(
                "supported standards unavailable".to_string(),
            )),
        );

        // Act
        let result = service
            .register_new_token(
                token_id.clone(),
                None,
                None,
                None,
                TEST_TIMESTAMP,
                &token_metadata_fetcher,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let registered_token = service
            .get_token(&token_id)
            .expect("token should be registered");
        let ChainTokenDetails::IC {
            supported_standards,
            ..
        } = registered_token.details;
        assert_eq!(supported_standards, vec![IcrcStandard::ICRC1]);
    }

    #[tokio::test]
    async fn it_should_do_update_token_metadata() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let initial_token = fixture_of_token(ledger_id, "ICP", vec![IcrcStandard::ICRC1]);
        service
            .add_bulk_tokens(vec![initial_token], TEST_TIMESTAMP)
            .unwrap();
        let token_metadata_fetcher = MockTokenMetadataFetcher::new(
            Ok(TokenMetadata {
                name: "Internet Computer".to_string(),
                fee: Nat::from(100u64),
                decimals: 18,
                symbol: "NEWICP".to_string(),
            }),
            Ok(fixture_of_supported_standard_records(vec![
                "ICRC-1", "ICRC-3",
            ])),
        );

        // Act
        let result = service
            .update_token_metadata(
                token_id.clone(),
                TEST_TIMESTAMP + 1,
                &token_metadata_fetcher,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let updated_token = service
            .get_token(&token_id)
            .expect("token should exist after metadata update");
        assert_eq!(updated_token.symbol, "NEWICP");
        assert_eq!(updated_token.name, "Internet Computer");
        assert_eq!(updated_token.decimals, 18);
        let ChainTokenDetails::IC {
            fee,
            supported_standards,
            ..
        } = updated_token.details;
        assert_eq!(fee, Nat::from(100u64));
        assert_eq!(
            supported_standards,
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC3]
        );
        assert_eq!(service.get_metadata().version, 3);
        assert_eq!(service.get_metadata().last_updated, TEST_TIMESTAMP + 1);
    }

    #[tokio::test]
    async fn it_should_do_update_token_metadata_with_default_icrc1_due_to_supported_standards_fetch_failure()
     {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let ledger_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let token_id = TokenId::IC { ledger_id };
        let initial_token = fixture_of_token(ledger_id, "ICP", vec![IcrcStandard::ICRC1]);
        service
            .add_bulk_tokens(vec![initial_token], TEST_TIMESTAMP)
            .unwrap();
        let token_metadata_fetcher = MockTokenMetadataFetcher::new(
            Ok(TokenMetadata {
                name: "Internet Computer".to_string(),
                fee: Nat::from(100u64),
                decimals: 18,
                symbol: "NEWICP".to_string(),
            }),
            Err(CanisterError::UnknownError(
                "supported standards unavailable".to_string(),
            )),
        );

        // Act
        let result = service
            .update_token_metadata(
                token_id.clone(),
                TEST_TIMESTAMP + 1,
                &token_metadata_fetcher,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let updated = service
            .get_token(&token_id)
            .expect("token should exist after metadata update");
        let ChainTokenDetails::IC {
            fee,
            supported_standards,
            ..
        } = updated.details;
        assert_eq!(updated.symbol, "NEWICP");
        assert_eq!(updated.name, "Internet Computer");
        assert_eq!(updated.decimals, 18);
        assert_eq!(fee, Nat::from(100u64));
        assert_eq!(supported_standards, vec![IcrcStandard::ICRC1]);
        assert_eq!(service.get_metadata().version, 3);
        assert_eq!(service.get_metadata().last_updated, TEST_TIMESTAMP + 1);
    }

    #[test]
    fn it_should_do_add_bulk_tokens() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token_1 = fixture_of_token(
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_2 = fixture_of_token(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "ckBTC",
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        );

        // Act
        let result =
            service.add_bulk_tokens(vec![token_1.clone(), token_2.clone()], TEST_TIMESTAMP);

        // Assert
        assert!(result.is_ok());
        assert_eq!(service.registry_repository.list_tokens().len(), 2);
        assert_eq!(
            service.get_token(&token_1.details.token_id()),
            Some(token_1)
        );
        assert_eq!(
            service.get_token(&token_2.details.token_id()),
            Some(token_2)
        );
        assert_eq!(service.get_metadata().version, 2);
        assert_eq!(service.get_metadata().last_updated, TEST_TIMESTAMP);
    }

    #[test]
    fn it_should_do_add_bulk_tokens_without_updating_metadata_due_to_existing_tokens_only() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token = fixture_of_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        service
            .add_bulk_tokens(vec![token], TEST_TIMESTAMP)
            .unwrap();
        let token = fixture_of_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let version_before = service.get_metadata().version;
        let last_updated_before = service.get_metadata().last_updated;

        // Act
        let result = service.add_bulk_tokens(vec![token], TEST_TIMESTAMP + 1);

        // Assert
        assert!(result.is_ok());
        assert_eq!(service.get_metadata().version, version_before);
        assert_eq!(service.get_metadata().last_updated, last_updated_before);
    }

    #[test]
    fn it_should_do_update_token_standards() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token = fixture_of_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_id = token.details.token_id();
        service
            .add_bulk_tokens(vec![token], TEST_TIMESTAMP)
            .unwrap();

        // Act
        let result = service.update_token_standards(
            token_id.clone(),
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
            TEST_TIMESTAMP + 1,
        );

        // Assert
        assert!(result.is_ok());
        let updated = service
            .get_token(&token_id)
            .expect("token should exist after standards update");
        let ChainTokenDetails::IC {
            supported_standards,
            ..
        } = updated.details;
        assert_eq!(
            supported_standards,
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2]
        );
        assert_eq!(service.get_metadata().last_updated, TEST_TIMESTAMP + 1);
    }

    #[test]
    fn it_should_do_delete_all_tokens() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = TokenRegistryService::new(&repo);
        let token = fixture_of_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        service
            .add_bulk_tokens(vec![token], TEST_TIMESTAMP)
            .unwrap();

        // Act
        let result = service.delete_all();

        // Assert
        assert!(result.is_ok());
        assert!(service.registry_repository.list_tokens().is_empty());
    }
}
