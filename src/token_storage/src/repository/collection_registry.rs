// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_mple_structures::{BTreeMapIteratorStructure, BTreeMapStructure, VersionedBTreeMap};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use std::{cell::RefCell, thread::LocalKey};
use token_storage_types::{
    collection::{CollectionId, RegistryCollection, RegistryCollectionCodec},
    error::CanisterError,
};

/// Store for CollectionRegistryRepository
pub type CollectionRegistryRepositoryStorage = VersionedBTreeMap<
    CollectionId,
    RegistryCollection,
    RegistryCollectionCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
pub type ThreadlocalCollectionRegistryRepositoryStorage =
    &'static LocalKey<RefCell<CollectionRegistryRepositoryStorage>>;

pub struct CollectionRegistryRepository<S: Storage<CollectionRegistryRepositoryStorage>> {
    collection_reg_repo: S,
}

impl<S: Storage<CollectionRegistryRepositoryStorage>> CollectionRegistryRepository<S> {
    /// Create a new CollectionRegistryRepository
    pub fn new(storage: S) -> Self {
        Self {
            collection_reg_repo: storage,
        }
    }

    /// Upsert a collection in the registry, replacing any existing entry with the same id.
    /// # Arguments
    /// * `input` - The collection to upsert
    /// # Returns
    /// * `CollectionId` - The id of the upserted collection
    pub fn upsert_collection(&mut self, input: RegistryCollection) -> CollectionId {
        let collection_id = input.collection_id;
        self.collection_reg_repo.with_borrow_mut(|store| {
            store.insert(collection_id, input);
        });
        collection_id
    }

    /// Check if a collection is in the registry
    pub fn contains(&self, collection_id: &CollectionId) -> bool {
        self.collection_reg_repo
            .with_borrow(|store| store.contains_key(collection_id))
    }

    /// Get a collection from the registry
    pub fn get_collection(&self, collection_id: &CollectionId) -> Option<RegistryCollection> {
        self.collection_reg_repo
            .with_borrow(|store| store.get(collection_id))
    }

    /// List collections in the registry, paginated over the BTreeMap's natural key order
    /// (deterministic across calls, unlike HashSet-derived pagination).
    /// # Arguments
    /// * `start` - Optional start index for pagination
    /// * `limit` - Optional limit for pagination
    pub fn list_collections(
        &self,
        start: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<RegistryCollection> {
        let start_idx = start.unwrap_or(0) as usize;

        self.collection_reg_repo.with_borrow(|store| {
            let iter = store.iter().skip(start_idx).map(|entry| entry.1);
            match limit {
                Some(limit) => iter.take(limit as usize).collect(),
                None => iter.collect(),
            }
        })
    }

    /// Count all collections in the registry
    pub fn count(&self) -> u64 {
        self.collection_reg_repo.with_borrow(|store| store.len())
    }

    /// Delete all collections from the registry
    pub fn delete_all(&mut self) -> Result<(), CanisterError> {
        self.collection_reg_repo.with_borrow_mut(|store| {
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

    fn fixture_of_collection(collection_id: Principal, name: &str) -> RegistryCollection {
        RegistryCollection {
            collection_id,
            name: name.to_string(),
            description: format!("{name} description"),
            image: "https://example.com/image.png".to_string(),
            total_items: 100,
            floor_price: Some(Nat::from(10u64)),
            royalty: Some(5),
            creator: collection_id,
            standard: "EXT".to_string(),
            is_cashier: false,
        }
    }

    #[test]
    fn it_should_do_upsert_collection() {
        // Arrange
        let repo = TestRepositories::new();
        let mut collection_registry_repository = repo.collection_registry();
        let collection_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let collection = fixture_of_collection(collection_id, "Bored Ape");

        // Act
        let result = collection_registry_repository.upsert_collection(collection.clone());

        // Assert
        assert_eq!(result, collection_id);
        assert_eq!(
            collection_registry_repository.get_collection(&collection_id),
            Some(collection)
        );
    }

    #[test]
    fn it_should_do_replace_existing_collection_on_upsert() {
        // Arrange
        let repo = TestRepositories::new();
        let mut collection_registry_repository = repo.collection_registry();
        let collection_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let original = fixture_of_collection(collection_id, "Bored Ape");
        collection_registry_repository.upsert_collection(original);
        let updated = fixture_of_collection(collection_id, "Bored Ape v2");

        // Act
        collection_registry_repository.upsert_collection(updated.clone());

        // Assert
        assert_eq!(
            collection_registry_repository.get_collection(&collection_id),
            Some(updated)
        );
        assert_eq!(collection_registry_repository.count(), 1);
    }

    #[test]
    fn it_should_do_check_collection_existence() {
        // Arrange
        let repo = TestRepositories::new();
        let mut collection_registry_repository = repo.collection_registry();
        let existing_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let missing_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        collection_registry_repository.upsert_collection(fixture_of_collection(existing_id, "A"));

        // Act / Assert
        assert!(collection_registry_repository.contains(&existing_id));
        assert!(!collection_registry_repository.contains(&missing_id));
    }

    #[test]
    fn it_should_do_return_none_due_to_unknown_collection() {
        // Arrange
        let repo = TestRepositories::new();
        let collection_registry_repository = repo.collection_registry();
        let collection_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        // Act
        let result = collection_registry_repository.get_collection(&collection_id);

        // Assert
        assert_eq!(result, None);
    }

    #[test]
    fn it_should_do_list_collections_with_deterministic_pagination() {
        // Arrange
        let repo = TestRepositories::new();
        let mut collection_registry_repository = repo.collection_registry();
        for i in 0..10u8 {
            let id = Principal::from_slice(&[i; 1]);
            collection_registry_repository
                .upsert_collection(fixture_of_collection(id, &format!("Collection {i}")));
        }

        // Act
        let page_1 = collection_registry_repository.list_collections(Some(0), Some(5));
        let page_1_again = collection_registry_repository.list_collections(Some(0), Some(5));
        let page_2 = collection_registry_repository.list_collections(Some(5), Some(5));
        let page_3 = collection_registry_repository.list_collections(Some(10), Some(5));

        // Assert
        assert_eq!(page_1.len(), 5);
        assert_eq!(page_2.len(), 5);
        assert_eq!(page_3.len(), 0);
        assert_eq!(page_1, page_1_again);
        assert_ne!(page_1, page_2);
    }

    #[test]
    fn it_should_do_return_empty_list_due_to_empty_registry() {
        // Arrange
        let repo = TestRepositories::new();
        let collection_registry_repository = repo.collection_registry();

        // Act
        let result = collection_registry_repository.list_collections(None, None);

        // Assert
        assert!(result.is_empty());
    }

    #[test]
    fn it_should_do_delete_all_collections() {
        // Arrange
        let repo = TestRepositories::new();
        let mut collection_registry_repository = repo.collection_registry();
        collection_registry_repository.upsert_collection(fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        ));

        // Act
        let result = collection_registry_repository.delete_all();

        // Assert
        assert!(result.is_ok());
        assert_eq!(collection_registry_repository.count(), 0);
    }
}
