// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_mple_structures::{BTreeMapIteratorStructure, BTreeMapStructure, VersionedBTreeMap};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use std::{cell::RefCell, thread::LocalKey};
use token_storage_types::{
    TokenId,
    error::CanisterError,
    token::{RegistryToken, RegistryTokenCodec},
};

/// Store for TokenRegistryRepository
pub type TokenRegistryRepositoryStorage =
    VersionedBTreeMap<TokenId, RegistryToken, RegistryTokenCodec, VirtualMemory<DefaultMemoryImpl>>;
pub type ThreadlocalTokenRegistryRepositoryStorage =
    &'static LocalKey<RefCell<TokenRegistryRepositoryStorage>>;

pub struct TokenRegistryRepository<S: Storage<TokenRegistryRepositoryStorage>> {
    token_reg_repo: S,
}

impl<S: Storage<TokenRegistryRepositoryStorage>> TokenRegistryRepository<S> {
    /// Create a new TokenRegistryRepository
    pub fn new(storage: S) -> Self {
        Self {
            token_reg_repo: storage,
        }
    }

    /// Register a new token in the registry
    /// # Arguments
    /// * `input` - The token to register
    /// * `token_registry_metadata_repo` - The token registry metadata repository to update the version if a new token is registered
    /// * `updated_at` - The timestamp of the update
    /// # Returns
    /// * `Ok(TokenId)` - The ID of the registered token if it was successfully registered or already exists
    /// * `Err(CanisterError)` - An error message if the token could not be registered
    pub fn register_token(&mut self, input: RegistryToken) -> Result<TokenId, String> {
        let token_id = input.details.token_id();
        self.token_reg_repo.with_borrow_mut(|store| {
            store.insert(token_id.clone(), input.clone());
        });

        Ok(token_id)
    }

    /// Check if a token is in the registry
    /// # Arguments
    /// * `token_id` - The ID of the token to check
    /// # Returns
    /// * `true` if the token is in the registry, `false` otherwise
    pub fn contains(&self, token_id: &TokenId) -> bool {
        self.token_reg_repo
            .with_borrow(|store| store.contains_key(token_id))
    }

    /// Get a token from the registry
    /// # Arguments
    /// * `token_id` - The ID of the token to get
    /// # Returns
    /// * `Some(RegistryToken)` if the token is in the registry, `None` otherwise
    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        self.token_reg_repo.with_borrow(|store| store.get(token_id))
    }

    /// List all tokens in the registry
    /// # Returns
    /// * `Vec<RegistryToken>` - A vector of all tokens in the registry
    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        self.token_reg_repo
            .with_borrow(|store| store.iter().map(|entry| entry.1).collect())
    }

    /// Delete all tokens from the registry
    /// # Returns
    /// * `Ok(())` if the tokens were successfully deleted
    /// * `Err(CanisterError)` if the tokens could not be deleted
    pub fn delete_all(&mut self) -> Result<(), CanisterError> {
        self.token_reg_repo.with_borrow_mut(|store| {
            store.clear();
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::{Repositories, tests::TestRepositories};
    use candid::{Nat, Principal};
    use token_storage_types::token::{ChainTokenDetails, IcrcStandard};

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

    #[test]
    fn it_should_do_register_token() {
        // Arrange
        let repo = TestRepositories::new();
        let mut token_registry_repository = repo.token_registry();
        let ledger_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let token = fixture_of_token(ledger_id, "ICP", vec![IcrcStandard::ICRC1]);

        // Act
        let result = token_registry_repository.register_token(token.clone());

        // Assert
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), token.details.token_id());
        assert_eq!(
            token_registry_repository.get_token(&token.details.token_id()),
            Some(token)
        );
    }

    #[test]
    fn it_should_do_check_token_existence() {
        // Arrange
        let repo = TestRepositories::new();
        let mut token_registry_repository = repo.token_registry();
        let existing_ledger_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let missing_ledger_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let existing_token = fixture_of_token(existing_ledger_id, "ICP", vec![IcrcStandard::ICRC1]);
        let existing_token_id = existing_token.details.token_id();
        let missing_token_id = TokenId::IC {
            ledger_id: missing_ledger_id,
        };
        token_registry_repository
            .register_token(existing_token)
            .unwrap();

        // Act
        let existing_result = token_registry_repository.contains(&existing_token_id);
        let missing_result = token_registry_repository.contains(&missing_token_id);

        // Assert
        assert!(existing_result);
        assert!(!missing_result);
    }

    #[test]
    fn it_should_do_get_token() {
        // Arrange
        let repo = TestRepositories::new();
        let mut token_registry_repository = repo.token_registry();
        let ledger_id = Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap();
        let token = fixture_of_token(
            ledger_id,
            "ckBTC",
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        );
        let token_id = token.details.token_id();
        token_registry_repository
            .register_token(token.clone())
            .unwrap();

        // Act
        let result = token_registry_repository.get_token(&token_id);

        // Assert
        assert_eq!(result, Some(token));
    }

    #[test]
    fn it_should_do_return_none_due_to_unknown_token() {
        // Arrange
        let repo = TestRepositories::new();
        let token_registry_repository = repo.token_registry();
        let token_id = TokenId::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };

        // Act
        let result = token_registry_repository.get_token(&token_id);

        // Assert
        assert_eq!(result, None);
    }

    #[test]
    fn it_should_do_list_tokens() {
        // Arrange
        let repo = TestRepositories::new();
        let mut token_registry_repository = repo.token_registry();
        let token_1 = fixture_of_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_2 = fixture_of_token(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "ckBTC",
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        );
        token_registry_repository
            .register_token(token_1.clone())
            .unwrap();
        token_registry_repository
            .register_token(token_2.clone())
            .unwrap();

        // Act
        let result = token_registry_repository.list_tokens();

        // Assert
        assert_eq!(result.len(), 2);
        assert!(result.contains(&token_1));
        assert!(result.contains(&token_2));
    }

    #[test]
    fn it_should_do_return_empty_list_due_to_empty_registry() {
        // Arrange
        let repo = TestRepositories::new();
        let token_registry_repository = repo.token_registry();

        // Act
        let result = token_registry_repository.list_tokens();

        // Assert
        assert!(result.is_empty());
    }

    #[test]
    fn it_should_do_delete_all_tokens() {
        // Arrange
        let repo = TestRepositories::new();
        let mut token_registry_repository = repo.token_registry();
        let token_1 = fixture_of_token(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "ICP",
            vec![IcrcStandard::ICRC1],
        );
        let token_2 = fixture_of_token(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "ckBTC",
            vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        );
        token_registry_repository.register_token(token_1).unwrap();
        token_registry_repository.register_token(token_2).unwrap();

        // Act
        let result = token_registry_repository.delete_all();

        // Assert
        assert!(result.is_ok());
        assert!(token_registry_repository.list_tokens().is_empty());
    }
}
