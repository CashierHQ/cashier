// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{collection::CollectionId, error::CanisterError};

use crate::repository::{
    Repositories, collection_registry::CollectionRegistryRepository,
    user_collection::UserCollectionRepository,
};

pub struct UserCollectionService<R: Repositories> {
    collection_repository: UserCollectionRepository<R::UserCollection>,
    registry_repository: CollectionRegistryRepository<R::CollectionRegistry>,
}

impl<R: Repositories> UserCollectionService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            collection_repository: repo.user_collection(),
            registry_repository: repo.collection_registry(),
        }
    }

    /// Enable or disable a single collection for a user.
    /// # Returns
    /// * `Ok(())` if the collection exists in the registry and its state was updated
    /// * `Err(CanisterError::NotFound)` if the collection doesn't exist in the registry
    pub fn update_enable(
        &mut self,
        user_id: Principal,
        collection_id: CollectionId,
        is_enabled: bool,
    ) -> Result<(), CanisterError> {
        if !self.registry_repository.contains(&collection_id) {
            return Err(CanisterError::not_found(
                "Collection",
                &collection_id.to_string(),
            ));
        }

        self.collection_repository
            .set_enabled(user_id, collection_id, is_enabled);
        Ok(())
    }

    /// Enable multiple collections for a user in one call. Unknown collection ids are
    /// silently dropped rather than failing the whole batch.
    /// # Returns
    /// * `Ok(())` - Even if the input list was empty or entirely unknown
    pub fn enable_bulk(
        &mut self,
        user_id: Principal,
        collection_ids: Vec<CollectionId>,
    ) -> Result<(), CanisterError> {
        let valid_ids: Vec<CollectionId> = collection_ids
            .into_iter()
            .filter(|id| self.registry_repository.contains(id))
            .collect();

        if !valid_ids.is_empty() {
            self.collection_repository
                .set_enabled_bulk(user_id, &valid_ids);
        }

        Ok(())
    }

    /// List the collection ids enabled by a user. Returns an empty list for a user who
    /// hasn't enabled anything yet.
    pub fn list_enabled(&self, user_id: &Principal) -> Vec<CollectionId> {
        self.collection_repository
            .list_enabled(user_id)
            .into_iter()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::tests::TestRepositories;
    use candid::Nat;
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::collection::RegistryCollection;

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
            is_default: false,
        }
    }

    #[test]
    fn it_should_fail_update_enable_due_to_unknown_collection() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = UserCollectionService::new(&repo);
        let user_id = random_principal_id();
        let collection_id = random_principal_id();

        // Act
        let result = service.update_enable(user_id, collection_id, true);

        // Assert
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CanisterError::NotFound(_)));
    }

    #[test]
    fn it_should_do_enable_known_collection() {
        // Arrange
        let repo = TestRepositories::new();
        let mut registry_repository = repo.collection_registry();
        let mut service = UserCollectionService::new(&repo);
        let user_id = random_principal_id();
        let collection_id = random_principal_id();
        registry_repository.upsert_collection(fixture_of_collection(collection_id, "Bored Ape"));

        // Act
        let result = service.update_enable(user_id, collection_id, true);
        let enabled = service.list_enabled(&user_id);

        // Assert
        assert!(result.is_ok());
        assert_eq!(enabled, vec![collection_id]);
    }

    #[test]
    fn it_should_do_disable_known_collection() {
        // Arrange
        let repo = TestRepositories::new();
        let mut registry_repository = repo.collection_registry();
        let mut service = UserCollectionService::new(&repo);
        let user_id = random_principal_id();
        let collection_id = random_principal_id();
        registry_repository.upsert_collection(fixture_of_collection(collection_id, "Bored Ape"));
        service.update_enable(user_id, collection_id, true).unwrap();

        // Act
        let result = service.update_enable(user_id, collection_id, false);
        let enabled = service.list_enabled(&user_id);

        // Assert
        assert!(result.is_ok());
        assert!(enabled.is_empty());
    }

    #[test]
    fn it_should_do_return_empty_list_for_new_user() {
        // Arrange
        let repo = TestRepositories::new();
        let service = UserCollectionService::new(&repo);
        let user_id = random_principal_id();

        // Act
        let enabled = service.list_enabled(&user_id);

        // Assert
        assert!(enabled.is_empty());
    }

    #[test]
    fn it_should_do_enable_bulk_filtering_unknown_ids() {
        // Arrange
        let repo = TestRepositories::new();
        let mut registry_repository = repo.collection_registry();
        let mut service = UserCollectionService::new(&repo);
        let user_id = random_principal_id();
        let known_id = random_principal_id();
        let unknown_id = random_principal_id();
        registry_repository.upsert_collection(fixture_of_collection(known_id, "Bored Ape"));

        // Act
        let result = service.enable_bulk(user_id, vec![known_id, unknown_id]);
        let enabled = service.list_enabled(&user_id);

        // Assert
        assert!(result.is_ok());
        assert_eq!(enabled, vec![known_id]);
    }

    #[test]
    fn it_should_do_return_ok_when_enabling_empty_list() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = UserCollectionService::new(&repo);
        let user_id = random_principal_id();

        // Act
        let result = service.enable_bulk(user_id, vec![]);

        // Assert
        assert!(result.is_ok());
        assert!(service.list_enabled(&user_id).is_empty());
    }

    #[test]
    fn it_should_do_return_ok_when_all_ids_in_batch_are_unknown() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = UserCollectionService::new(&repo);
        let user_id = random_principal_id();
        let unknown_id = random_principal_id();

        // Act
        let result = service.enable_bulk(user_id, vec![unknown_id]);

        // Assert
        assert!(result.is_ok());
        assert!(service.list_enabled(&user_id).is_empty());
    }
}
