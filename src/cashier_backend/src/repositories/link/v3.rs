// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{
    keys::LinkKey,
    link::v3::{LinkCodecV3, LinkV3},
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type LinkV3RepositoryStorage =
    VersionedBTreeMap<String, LinkV3, LinkCodecV3, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct LinkV3Repository<S: Storage<LinkV3RepositoryStorage>> {
    storage: S,
}

impl<S: Storage<LinkV3RepositoryStorage>> LinkV3Repository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }
    pub fn create(&mut self, link: LinkV3) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn get(&self, id: &LinkKey) -> Option<LinkV3> {
        self.storage.with_borrow(|store| store.get(id))
    }

    pub fn get_batch(&self, ids: Vec<LinkKey>) -> Vec<LinkV3> {
        self.storage
            .with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn update(&mut self, link: LinkV3) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }
}

#[cfg(test)]
mod tests {
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_backend_types::repository::link::{
        v1::LinkType,
        v3::{LinkState, LinkV3},
    };
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn fixture_of_link_v3(id: &str, title: &str, state: LinkState, max_use: u64, use_count: u64) -> LinkV3 {
        LinkV3 {
            id: id.to_string(),
            title: title.to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![],
            max_use,
            use_count,
            creator: random_principal_id(),
            state,
            created_at: 1_622_547_800,
        }
    }

    #[test]
    fn it_should_fail_get_link_due_to_link_not_found() {
        // Arrange
        let repo = TestRepositories::new().link_v3();
        let link_id = random_id_string();

        // Act
        let result = repo.get(&link_id);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_fail_get_batch_links_due_to_all_links_not_found() {
        // Arrange
        let repo = TestRepositories::new().link_v3();
        let ids = vec![random_id_string(), random_id_string()];

        // Act
        let result = repo.get_batch(ids);

        // Assert
        assert!(result.is_empty());
    }

    #[test]
    fn it_should_succeed_create_link_v3() {
        // Arrange
        let mut repo = TestRepositories::new().link_v3();
        let link_id = random_id_string();
        let link = fixture_of_link_v3(&link_id, "Test Link V3", LinkState::Created, 10, 0);

        // Act
        repo.create(link.clone());

        // Assert
        let result = repo.get(&link_id);
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.id, link_id);
        assert_eq!(result.title, "Test Link V3");
        assert_eq!(result.state, LinkState::Created);
    }

    #[test]
    fn it_should_succeed_update_link_v3() {
        // Arrange
        let mut repo = TestRepositories::new().link_v3();
        let link_id = random_id_string();
        let initial_link = fixture_of_link_v3(&link_id, "Initial Link V3", LinkState::Created, 10, 0);
        repo.create(initial_link);

        let mut updated_link =
            fixture_of_link_v3(&link_id, "Updated Link V3", LinkState::Active, 20, 1);
        updated_link.creator = random_principal_id();

        // Act
        repo.update(updated_link.clone());

        // Assert
        let result = repo.get(&link_id);
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.title, "Updated Link V3");
        assert_eq!(result.state, LinkState::Active);
        assert_eq!(result.max_use, 20);
        assert_eq!(result.use_count, 1);
    }

    #[test]
    fn it_should_succeed_get_batch_links_v3() {
        // Arrange
        let mut repo = TestRepositories::new().link_v3();
        let link_id_1 = random_id_string();
        let link_id_2 = random_id_string();

        let link_1 = fixture_of_link_v3(&link_id_1, "Link V3 1", LinkState::Active, 10, 0);
        let link_2 = fixture_of_link_v3(&link_id_2, "Link V3 2", LinkState::Created, 20, 1);
        repo.create(link_1);
        repo.create(link_2);

        // Act
        let result = repo.get_batch(vec![link_id_1.clone(), link_id_2.clone()]);

        // Assert
        assert_eq!(result.len(), 2);
        let ids = result.iter().map(|link| link.id.clone()).collect::<Vec<_>>();
        assert!(ids.contains(&link_id_1));
        assert!(ids.contains(&link_id_2));
    }
}
