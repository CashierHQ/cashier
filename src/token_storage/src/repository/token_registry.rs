// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, thread::LocalKey};

use ic_mple_structures::{BTreeMapIteratorStructure, BTreeMapStructure, VersionedBTreeMap};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use token_storage_types::{token::{RegistryToken, RegistryTokenCodec}, TokenId};

use crate::repository::token_registry_metadata::TokenRegistryMetadataRepositoryStorage;

use super::token_registry_metadata::TokenRegistryMetadataRepository;

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

    // this function will update the token registry version if a new token is added
    pub fn register_token<M: Storage<TokenRegistryMetadataRepositoryStorage>>(
        &mut self,
        input: RegistryToken,
        token_registry_repo: &mut TokenRegistryMetadataRepository<M>,
    ) -> Result<TokenId, String> {
        let token_id = input.details.token_id();
        let is_new_token = !self
            .token_reg_repo
            .with_borrow(|store| store.contains_key(&token_id));

        self.token_reg_repo.with_borrow_mut(|store| {
            store.insert(token_id.clone(), input.clone());
        });

        // If this is a new token, increment the registry version
        if is_new_token {
            token_registry_repo.increase_version();
        }

        Ok(token_id)
    }

    /// Check if a token is in the registry
    pub fn contains(&self, token_id: &TokenId) -> bool {
        self.token_reg_repo
            .with_borrow(|store| store.contains_key(token_id))
    }

    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        self.token_reg_repo.with_borrow(|store| store.get(token_id))
    }

    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        self.token_reg_repo
            .with_borrow(|store| store.iter().map(|entry| entry.1).collect())
    }

    pub fn delete_all(&mut self) -> Result<(), String> {
        self.token_reg_repo.with_borrow_mut(|store| {
            store.clear();
            Ok(())
        })
    }
}
