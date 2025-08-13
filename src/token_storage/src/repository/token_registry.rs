// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::TokenId;

use crate::types::RegistryToken;

use super::{TOKEN_REGISTRY_STORE, token_registry_metadata::TokenRegistryMetadataRepository};

pub struct TokenRegistryRepository {}

impl Default for TokenRegistryRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl TokenRegistryRepository {
    pub fn new() -> Self {
        Self {}
    }

    // this function will update the token registry version if a new token is added
    pub fn register_token(&self, input: RegistryToken) -> Result<TokenId, String> {
        let token_id = input.details.token_id();
        let is_new_token = !TOKEN_REGISTRY_STORE.with_borrow(|store| store.contains_key(&token_id));

        TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
            store.insert(token_id.clone(), input.clone());
        });

        // If this is a new token, increment the registry version
        if is_new_token {
            let metadata_repository = TokenRegistryMetadataRepository::new();
            metadata_repository.increase_version();
        }

        Ok(token_id)
    }

    // this function will update the token registry version if a new token is added
    pub fn add_bulk_tokens(&self, tokens: Vec<RegistryToken>) -> Result<Vec<TokenId>, String> {
        let mut token_ids = Vec::new();
        let mut any_new_tokens = false;

        // First pass: check if any tokens are new
        for input in &tokens {
            let is_new = !TOKEN_REGISTRY_STORE
                .with_borrow(|store| store.contains_key(&input.details.token_id()));
            if is_new {
                any_new_tokens = true;
                break;
            }
        }

        // Second pass: register all tokens
        for input in tokens {
            let token_id = self.register_token(input)?;
            token_ids.push(token_id);
        }

        // If any tokens were new, increment the version
        // (this is a safeguard in case register_token didn't increment)
        if any_new_tokens {
            let metadata_repository = TokenRegistryMetadataRepository::new();
            metadata_repository.increase_version();
        }

        Ok(token_ids)
    }

    pub fn get_token(&self, token_id: &TokenId) -> Option<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.get(token_id))
    }

    pub fn list_tokens(&self) -> Vec<RegistryToken> {
        TOKEN_REGISTRY_STORE.with_borrow(|store| store.iter().map(|entry| entry.value()).collect())
    }

    pub fn delete_all(&self) -> Result<(), String> {
        TOKEN_REGISTRY_STORE.with_borrow_mut(|store| {
            store.clear_new();
            Ok(())
        })
    }
}
