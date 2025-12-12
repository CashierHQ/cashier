// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, thread::LocalKey};

use ic_cdk::api::time;
use ic_mple_structures::{CellStructure, VersionedStableCell};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

use crate::types::{TokenRegistryMetadata, TokenRegistryMetadataCodec};

/// Store for TokenRegistryMetadataRepository
pub type TokenRegistryMetadataRepositoryStorage = VersionedStableCell<
    TokenRegistryMetadata,
    TokenRegistryMetadataCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
pub type ThreadlocalTokenRegistryMetadataRepositoryStorage =
    &'static LocalKey<RefCell<TokenRegistryMetadataRepositoryStorage>>;

pub struct TokenRegistryMetadataRepository<S: Storage<TokenRegistryMetadataRepositoryStorage>> {
    token_store: S,
}

impl<S: Storage<TokenRegistryMetadataRepositoryStorage>> TokenRegistryMetadataRepository<S> {
    /// Create a new TokenRegistryMetadataRepository
    pub fn new(storage: S) -> Self {
        Self {
            token_store: storage,
        }
    }

    pub fn get(&self) -> TokenRegistryMetadata {
        self.token_store
            .with_borrow(|store| store.get().into_owned())
    }

    pub fn increase_version(&mut self) -> u64 {
        self.token_store.with_borrow_mut(|store| {
            let mut metadata = store.get().into_owned();
            metadata.version += 1;
            metadata.last_updated = time();
            store.set(metadata);

            let updated_metadata = store.get().clone();
            updated_metadata.version
        })
    }
}
