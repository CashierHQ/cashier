// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{keys::LinkKey, link::v1::Link};
use ic_mple_log::service::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, memory_manager::VirtualMemory};

pub type LinkRepositoryStorage = StableBTreeMap<LinkKey, Link, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct LinkRepository<S: Storage<LinkRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<LinkRepositoryStorage>> LinkRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }
    pub fn create(&mut self, link: Link) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn get(&self, id: &LinkKey) -> Option<Link> {
        self.storage.with_borrow(|store| store.get(id))
    }

    pub fn get_batch(&self, ids: Vec<LinkKey>) -> Vec<Link> {
        self.storage
            .with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn update(&mut self, link: Link) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn delete(&mut self, id: &LinkKey) {
        self.storage.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::*,
    };
    use cashier_backend_types::repository::link::v1::{LinkState, LinkType};

    #[test]
    fn it_should_create_a_link() {
        // Arrange
        let mut repo = TestRepositories::new().link();
        let link_id = random_id_string();
        let creator_id = random_principal_id();
        let link = Link {
            id: link_id,
            state: LinkState::ChooseLinkType,
            title: Some("Test Link".to_string()),
            description: Some("This is a test link".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: vec![],
            template: None,
            creator: creator_id,
            create_at: 1622547800,
            metadata: Default::default(),
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };

        // Act
        repo.create(link.clone());

        // Assert
        let fetched_link = repo.get(&link.id);
        assert!(fetched_link.is_some());
        let link_creator = fetched_link.unwrap().creator;
        assert_eq!(link_creator, creator_id);
    }

    #[test]
    fn it_should_update_a_link() {
        // Arrange
        let mut repo = TestRepositories::new().link();
        let link_id = random_id_string();
        let creator_id1 = random_principal_id();
        let creator_id2 = random_principal_id();
        let link = Link {
            id: link_id.clone(),
            state: LinkState::ChooseLinkType,
            title: Some("Test Link".to_string()),
            description: Some("This is a test link".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: vec![],
            template: None,
            creator: creator_id1,
            create_at: 1622547800,
            metadata: Default::default(),
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        repo.create(link);

        let updated_link = Link {
            id: link_id,
            state: LinkState::Active,
            title: Some("Updated Test Link".to_string()),
            description: Some("This is an updated test link".to_string()),
            link_type: Some(LinkType::ReceivePayment),
            asset_info: vec![],
            template: None,
            creator: creator_id2.clone(),
            create_at: 1622547800,
            metadata: Default::default(),
            link_use_action_counter: 1,
            link_use_action_max_count: 20,
        };

        // Act
        repo.update(updated_link.clone());

        // Assert
        let fetched_link = repo.get(&updated_link.id);
        assert!(fetched_link.is_some());
        let fetched_link = fetched_link.unwrap();
        assert_eq!(fetched_link.state, LinkState::Active);
        assert_eq!(fetched_link.creator, creator_id2);
    }

    #[test]
    fn it_should_delete_a_link() {
        // Arrange
        let mut repo = TestRepositories::new().link();
        let link_id = random_id_string();
        let creator_id = random_principal_id();
        let link = Link {
            id: link_id,
            state: LinkState::ChooseLinkType,
            title: Some("Test Link".to_string()),
            description: Some("This is a test link".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: vec![],
            template: None,
            creator: creator_id,
            create_at: 1622547800,
            metadata: Default::default(),
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        repo.create(link.clone());

        // Act
        repo.delete(&link.id);

        // Assert
        let fetched_link = repo.get(&link.id);
        assert!(fetched_link.is_none());
    }

    #[test]
    fn it_should_get_batch_of_links() {
        // Arrange
        let mut repo = TestRepositories::new().link();
        let link_id1 = random_id_string();
        let link_id2 = random_id_string();
        let creator1 = random_principal_id();
        let creator2 = random_principal_id();
        let link1 = Link {
            id: link_id1.clone(),
            state: LinkState::ChooseLinkType,
            title: Some("Test Link 1".to_string()),
            description: Some("This is a test link 1".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: vec![],
            template: None,
            creator: creator1,
            create_at: 1622547800,
            metadata: Default::default(),
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        let link2 = Link {
            id: link_id2.clone(),
            state: LinkState::Active,
            title: Some("Test Link 2".to_string()),
            description: Some("This is a test link 2".to_string()),
            link_type: Some(LinkType::ReceivePayment),
            asset_info: vec![],
            template: None,
            creator: creator2,
            create_at: 1622547800,
            metadata: Default::default(),
            link_use_action_counter: 1,
            link_use_action_max_count: 20,
        };
        repo.create(link1);
        repo.create(link2);

        let ids = vec![link_id1.clone(), link_id2.clone()];

        // Act
        let fetched_links = repo.get_batch(ids);

        // Assert
        assert_eq!(fetched_links.len(), 2);
        assert_eq!(fetched_links.first().unwrap().id, link_id1);
        assert_eq!(fetched_links.get(1).unwrap().id, link_id2);
    }

    #[test]
    fn it_should_get_a_link() {
        // Arrange
        let mut repo = TestRepositories::new().link();
        let link_id = random_id_string();
        let creator_id = random_principal_id();
        let link = Link {
            id: link_id.clone(),
            state: LinkState::ChooseLinkType,
            title: Some("Test Link".to_string()),
            description: Some("This is a test link".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: vec![],
            template: None,
            creator: creator_id,
            create_at: 1622547800,
            metadata: Default::default(),
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        repo.create(link);

        // Act
        let fetched_link = repo.get(&link_id);

        // Assert
        assert!(fetched_link.is_some());
        assert_eq!(fetched_link.unwrap().id, link_id);
    }
}
