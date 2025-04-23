use ic_cdk::api::time;

use super::TOKEN_REGISTRY_METADATA_STORE;
use crate::types::TokenRegistryMetadata;

pub struct TokenRegistryMetadataRepository {}

impl TokenRegistryMetadataRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn get(&self) -> TokenRegistryMetadata {
        TOKEN_REGISTRY_METADATA_STORE.with_borrow(|store| store.get().clone())
    }

    pub fn update(&self, update_fn: impl FnOnce(&mut TokenRegistryMetadata)) {
        TOKEN_REGISTRY_METADATA_STORE.with_borrow_mut(|store| {
            let mut metadata = store.get().clone();
            update_fn(&mut metadata);
            let _ = store.set(metadata);
        });
    }

    pub fn increase_version(&self) -> u64 {
        TOKEN_REGISTRY_METADATA_STORE.with_borrow_mut(|store| {
            let mut metadata = store.get().clone();
            metadata.current_version += 1;
            metadata.last_updated = time();
            let _ = store.set(metadata);

            let updated_metadata = store.get().clone();
            updated_metadata.current_version
        })
    }
}
