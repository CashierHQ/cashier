// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use std::{cell::RefCell, collections::HashSet, thread::LocalKey};
use token_storage_types::collection::{CollectionId, UserCollectionCodec};

/// Store for UserCollectionRepository
pub type UserCollectionRepositoryStorage = VersionedBTreeMap<
    Principal,
    HashSet<CollectionId>,
    UserCollectionCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
pub type ThreadlocalUserCollectionRepositoryStorage =
    &'static LocalKey<RefCell<UserCollectionRepositoryStorage>>;

/// Plain `Principal -> HashSet<CollectionId>` map, no "must be initialized" ceremony —
/// listing for a user with no entries returns an empty set, not an error, mirroring
/// `UserNftRepository` rather than `UserTokenRepository`.
pub struct UserCollectionRepository<S: Storage<UserCollectionRepositoryStorage>> {
    collection_store: S,
}

impl<S: Storage<UserCollectionRepositoryStorage>> UserCollectionRepository<S> {
    /// Create a new UserCollectionRepository
    pub fn new(storage: S) -> Self {
        Self {
            collection_store: storage,
        }
    }

    /// Enable or disable a collection for a user
    pub fn set_enabled(
        &mut self,
        user_id: Principal,
        collection_id: CollectionId,
        is_enabled: bool,
    ) {
        self.collection_store.with_borrow_mut(|store| {
            let mut enabled = store.get(&user_id).unwrap_or_default();

            if is_enabled {
                enabled.insert(collection_id);
            } else {
                enabled.remove(&collection_id);
            }

            store.insert(user_id, enabled);
        });
    }

    /// Enable multiple collections for a user in one write
    pub fn set_enabled_bulk(&mut self, user_id: Principal, collection_ids: &[CollectionId]) {
        self.collection_store.with_borrow_mut(|store| {
            let mut enabled = store.get(&user_id).unwrap_or_default();
            enabled.extend(collection_ids.iter().copied());
            store.insert(user_id, enabled);
        });
    }

    /// List the collections enabled by a user. Returns an empty set for unknown users.
    pub fn list_enabled(&self, user_id: &Principal) -> HashSet<CollectionId> {
        self.collection_store
            .with_borrow(|store| store.get(user_id).unwrap_or_default())
    }
}

#[cfg(test)]
mod tests {
    use crate::repository::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn it_should_do_return_empty_set_for_unknown_user() {
        // Arrange
        let repo = TestRepositories::new();
        let user_collection_repository = repo.user_collection();
        let user_id = random_principal_id();

        // Act
        let result = user_collection_repository.list_enabled(&user_id);

        // Assert
        assert!(result.is_empty());
    }

    #[test]
    fn it_should_do_enable_collection() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_collection_repository = repo.user_collection();
        let user_id = random_principal_id();
        let collection_id = random_principal_id();

        // Act
        user_collection_repository.set_enabled(user_id, collection_id, true);
        let result = user_collection_repository.list_enabled(&user_id);

        // Assert
        assert_eq!(result.len(), 1);
        assert!(result.contains(&collection_id));
    }

    #[test]
    fn it_should_do_disable_collection() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_collection_repository = repo.user_collection();
        let user_id = random_principal_id();
        let collection_id = random_principal_id();
        user_collection_repository.set_enabled(user_id, collection_id, true);

        // Act
        user_collection_repository.set_enabled(user_id, collection_id, false);
        let result = user_collection_repository.list_enabled(&user_id);

        // Assert
        assert!(result.is_empty());
    }

    #[test]
    fn it_should_do_enable_be_idempotent() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_collection_repository = repo.user_collection();
        let user_id = random_principal_id();
        let collection_id = random_principal_id();

        // Act
        user_collection_repository.set_enabled(user_id, collection_id, true);
        user_collection_repository.set_enabled(user_id, collection_id, true);
        let result = user_collection_repository.list_enabled(&user_id);

        // Assert
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn it_should_do_enable_bulk_collections() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_collection_repository = repo.user_collection();
        let user_id = random_principal_id();
        let collection_id_1 = random_principal_id();
        let collection_id_2 = random_principal_id();

        // Act
        user_collection_repository.set_enabled_bulk(user_id, &[collection_id_1, collection_id_2]);
        let result = user_collection_repository.list_enabled(&user_id);

        // Assert
        assert_eq!(result.len(), 2);
        assert!(result.contains(&collection_id_1));
        assert!(result.contains(&collection_id_2));
    }
}
