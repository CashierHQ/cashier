// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::{
    collection::{
        CollectionDto, CollectionId, CollectionRegistryStats, RegistryCollection,
        validate_collection_input,
    },
    error::CanisterError,
};

use crate::repository::{Repositories, collection_registry::CollectionRegistryRepository};

pub struct CollectionRegistryService<R: Repositories> {
    pub registry_repository: CollectionRegistryRepository<R::CollectionRegistry>,
}

impl<R: Repositories> CollectionRegistryService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            registry_repository: repo.collection_registry(),
        }
    }

    /// Get a collection from the registry by id
    /// # Arguments
    /// * `collection_id` - The id of the collection to get
    /// # Returns
    /// * `Option<RegistryCollection>` - The collection if it exists, None otherwise
    pub fn get_collection(&self, collection_id: &CollectionId) -> Option<RegistryCollection> {
        self.registry_repository.get_collection(collection_id)
    }

    /// List collections from the registry, paginated, as DTOs
    /// # Arguments
    /// * `start` - The starting index for pagination
    /// * `limit` - The maximum number of collections to return
    /// * `is_default` - If set, only collections with a matching `is_default` value are returned
    /// # Returns
    /// * `Vec<CollectionDto>` - The list of collections matching the criteria
    pub fn list_collections(
        &self,
        start: Option<u32>,
        limit: Option<u32>,
        is_default: Option<bool>,
    ) -> Vec<CollectionDto> {
        self.registry_repository
            .list_collections(start, limit, is_default)
            .into_iter()
            .map(CollectionDto::from)
            .collect()
    }

    /// Validate and upsert a batch of collections, replacing any existing entries by id.
    /// # Arguments
    /// * `collections` - The list of collections to upsert
    /// # Returns
    /// * `Ok(u32)` - The number of collections upserted
    /// * `Err(CanisterError::ValidationErrors)` - If any collection fails validation; no
    ///   collection in the batch is upserted in that case
    pub fn upsert_collections(
        &mut self,
        collections: Vec<RegistryCollection>,
    ) -> Result<u32, CanisterError> {
        for collection in &collections {
            validate_collection_input(collection).map_err(CanisterError::ValidationErrors)?;
        }

        let count = collections.len() as u32;
        for collection in collections {
            self.registry_repository.upsert_collection(collection);
        }

        Ok(count)
    }

    /// Delete all collections from the registry
    /// # Returns
    /// * `Ok(())` - If the operation was successful
    /// * `Err(CanisterError)` - If there was an error during the operation
    pub fn delete_all(&mut self) -> Result<(), CanisterError> {
        self.registry_repository.delete_all()
    }

    /// Get aggregate stats about the registry
    /// # Returns
    /// * `CollectionRegistryStats` - The stats about the registry
    pub fn stats(&self) -> CollectionRegistryStats {
        let collections = self.registry_repository.list_collections(None, None, None);
        CollectionRegistryStats {
            total_collections: self.registry_repository.count() as usize,
            total_cashier: collections.iter().filter(|c| c.is_cashier).count(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::tests::TestRepositories;
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
            is_default: false,
        }
    }

    #[test]
    fn it_should_fail_upsert_collections_due_to_empty_name() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = CollectionRegistryService::new(&repo);
        let mut collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );
        collection.name = "".to_string();

        // Act
        let result = service.upsert_collections(vec![collection]);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(_)
        ));
        assert_eq!(service.registry_repository.count(), 0);
    }

    #[test]
    fn it_should_fail_upsert_collections_due_to_one_invalid_in_batch() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = CollectionRegistryService::new(&repo);
        let valid = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );
        let mut invalid = fixture_of_collection(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "Azuki",
        );
        invalid.standard = "".to_string();

        // Act
        let result = service.upsert_collections(vec![valid, invalid]);

        // Assert
        assert!(result.is_err());
        assert_eq!(
            service.registry_repository.count(),
            0,
            "no collection should be upserted if any in the batch is invalid"
        );
    }

    #[test]
    fn it_should_do_upsert_collections_and_list_them() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = CollectionRegistryService::new(&repo);
        let collection_1 = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );
        let collection_2 = fixture_of_collection(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "Azuki",
        );

        // Act
        let result = service.upsert_collections(vec![collection_1.clone(), collection_2.clone()]);
        let listed = service.list_collections(None, None, None);

        // Assert
        assert_eq!(result.unwrap(), 2);
        assert_eq!(listed.len(), 2);
        assert!(
            listed
                .iter()
                .any(|c| c.collection_id == collection_1.collection_id)
        );
        assert!(
            listed
                .iter()
                .any(|c| c.collection_id == collection_2.collection_id)
        );
    }

    #[test]
    fn it_should_do_replace_by_id_on_re_upsert() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = CollectionRegistryService::new(&repo);
        let collection_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        service
            .upsert_collections(vec![fixture_of_collection(collection_id, "Bored Ape")])
            .unwrap();

        // Act
        service
            .upsert_collections(vec![fixture_of_collection(collection_id, "Bored Ape v2")])
            .unwrap();

        // Assert
        assert_eq!(service.registry_repository.count(), 1);
        assert_eq!(
            service.get_collection(&collection_id).unwrap().name,
            "Bored Ape v2"
        );
    }

    #[test]
    fn it_should_do_return_none_for_unknown_collection() {
        // Arrange
        let repo = TestRepositories::new();
        let service = CollectionRegistryService::new(&repo);
        let collection_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        // Act
        let result = service.get_collection(&collection_id);

        // Assert
        assert_eq!(result, None);
    }

    #[test]
    fn it_should_preserve_is_default_flag_through_upsert_and_list() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = CollectionRegistryService::new(&repo);
        let mut default_collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Cashier Curated",
        );
        default_collection.is_default = true;
        let non_default_collection = fixture_of_collection(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "Bored Ape",
        );

        // Act
        service
            .upsert_collections(vec![
                default_collection.clone(),
                non_default_collection.clone(),
            ])
            .unwrap();
        let listed = service.list_collections(None, None, None);

        // Assert
        let listed_default = listed
            .iter()
            .find(|c| c.collection_id == default_collection.collection_id)
            .unwrap();
        let listed_non_default = listed
            .iter()
            .find(|c| c.collection_id == non_default_collection.collection_id)
            .unwrap();
        assert!(listed_default.is_default);
        assert!(!listed_non_default.is_default);
    }

    #[test]
    fn it_should_filter_list_collections_by_is_default() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = CollectionRegistryService::new(&repo);
        let mut default_collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Cashier Curated",
        );
        default_collection.is_default = true;
        let non_default_collection = fixture_of_collection(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "Bored Ape",
        );
        service
            .upsert_collections(vec![
                default_collection.clone(),
                non_default_collection.clone(),
            ])
            .unwrap();

        // Act
        let only_default = service.list_collections(None, None, Some(true));
        let only_non_default = service.list_collections(None, None, Some(false));

        // Assert
        assert_eq!(only_default.len(), 1);
        assert_eq!(
            only_default[0].collection_id,
            default_collection.collection_id
        );
        assert_eq!(only_non_default.len(), 1);
        assert_eq!(
            only_non_default[0].collection_id,
            non_default_collection.collection_id
        );
    }

    #[test]
    fn it_should_do_compute_stats() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = CollectionRegistryService::new(&repo);
        let mut cashier_collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Cashier Originals",
        );
        cashier_collection.is_cashier = true;
        let non_cashier_collection = fixture_of_collection(
            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
            "Bored Ape",
        );
        service
            .upsert_collections(vec![cashier_collection, non_cashier_collection])
            .unwrap();

        // Act
        let stats = service.stats();

        // Assert
        assert_eq!(stats.total_collections, 2);
        assert_eq!(stats.total_cashier, 1);
    }

    #[test]
    fn it_should_do_delete_all_collections() {
        // Arrange
        let repo = TestRepositories::new();
        let mut service = CollectionRegistryService::new(&repo);
        service
            .upsert_collections(vec![fixture_of_collection(
                Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                "Bored Ape",
            )])
            .unwrap();

        // Act
        let result = service.delete_all();

        // Assert
        assert!(result.is_ok());
        assert!(service.list_collections(None, None, None).is_empty());
    }
}
