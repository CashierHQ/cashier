// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_cdk::api::time;

use super::TOKEN_REGISTRY_METADATA_STORE;
use crate::types::TokenRegistryMetadata;

pub struct TokenRegistryMetadataRepository {}

impl Default for TokenRegistryMetadataRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl TokenRegistryMetadataRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn get(&self) -> TokenRegistryMetadata {
        TOKEN_REGISTRY_METADATA_STORE.with_borrow(|store| store.get().clone())
    }

    pub fn increase_version(&self) -> u64 {
        TOKEN_REGISTRY_METADATA_STORE.with_borrow_mut(|store| {
            let mut metadata = store.get().clone();
            metadata.version += 1;
            metadata.last_updated = time();
            let _ = store.set(metadata);

            let updated_metadata = store.get().clone();
            updated_metadata.version
        })
    }
}
