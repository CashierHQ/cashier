// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, thread::LocalKey};

use ic_mple_utils::store::Storage;
use ic_stable_structures::{memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap};
use token_storage_types::TokenId;

use crate::{repository::token_registry_metadata::TokenRegistryMetadataRepositoryStorage, types::RegistryToken};

use super::{token_registry_metadata::TokenRegistryMetadataRepository};

/// Store for TokenRegistryRepository
pub type TokenRegistryRepositoryStorage = StableBTreeMap<TokenId, RegistryToken, VirtualMemory<DefaultMemoryImpl>>;
pub type ThreadlocalTokenRegistryRepositoryStorage = &'static LocalKey<RefCell<TokenRegistryRepositoryStorage>>;

pub struct TokenRegistryRepository<S: Storage<TokenRegistryRepositoryStorage>> {
    token_reg_meta_repo: S,

}

impl TokenRegistryRepository<ThreadlocalTokenRegistryRepositoryStorage> {

    /// Create a new TokenRegistryRepository
    pub fn new() -> Self {
        Self::new_with_storage(&super::TOKEN_REGISTRY_STORE)
    }
}

impl <S: Storage<TokenRegistryRepositoryStorage>> TokenRegistryRepository<S> {

    /// Create a new TokenRegistryRepository
    pub fn new_with_storage(storage: S) -> Self {
        Self {
            token_reg_meta_repo: storage
        }
    }

    // this function will update the token registry version if a new token is added
    pub fn register_token<M: Storage<TokenRegistryMetadataRepositoryStorage>>(&mut self, input: RegistryToken, token_registry_repo: &mut TokenRegistryMetadataRepository<M>) -> Result<TokenId, String> {
        let token_id = input.details.token_id();
        let is_new_token = !self.token_reg_meta_repo.with_borrow(|store| store.contains_key(&token_id));

        self.token_reg_meta_repo.with_borrow_mut(|store| {
            store.insert(token_id.clone(), input.clone());
        });

        // If this is a new token, increment the registry version
        if is_new_token {
            token_registry_repo.increase_version();
        }

        Ok(token_id)
    }

    // this function will update the token registry version if a new token is added
    pub fn add_bulk_tokens<M: Storage<TokenRegistryMetadataRepositoryStorage>>(&mut self, tokens: Vec<RegistryToken>, token_registry_repo: &mut TokenRegistryMetadataRepository<M>) -> Result<Vec<TokenId>, String> {
        let mut token_ids = Vec::new();
        let mut any_new_tokens = false;

        // First pass: check if any tokens are new
        for input in &tokens {
            let is_new = !self.token_reg_meta_repo
                .with_borrow(|store| store.contains_key(&input.details.token_id()));
            if is_new {
                any_new_tokens = true;
                break;
            }
        }

        // Second pass: register all tokens
        for input in tokens {
            let token_id = self.register_token(input, token_registry_repo)?;
            token_ids.push(token_id);
        }

        // If any tokens were new, increment the version
        // (this is a safeguard in case register_token didn't increment)
        if any_new_tokens {
            token_registry_repo.increase_version();
        }

        Ok(token_ids)
    }

    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        self.token_reg_meta_repo.with_borrow(|store| store.get(token_id))
    }

    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        self.token_reg_meta_repo.with_borrow(|store| store.iter().map(|entry| entry.value()).collect())
    }

    pub fn delete_all(&mut self) -> Result<(), String> {
        self.token_reg_meta_repo.with_borrow_mut(|store| {
            store.clear_new();
            Ok(())
        })
    }
}
