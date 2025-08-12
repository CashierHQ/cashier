// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::LINK_STORE;
use cashier_backend_types::repository::{keys::LinkKey, link::v1::Link};

#[derive(Clone)]

pub struct LinkRepository {}

impl Default for LinkRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl LinkRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, link: Link) {
        LINK_STORE.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn get(&self, id: &LinkKey) -> Option<Link> {
        LINK_STORE.with_borrow(|store| store.get(id))
    }

    pub fn get_batch(&self, ids: Vec<LinkKey>) -> Vec<Link> {
        LINK_STORE.with_borrow(|store| ids.into_iter().filter_map(|id| store.get(&id)).collect())
    }

    pub fn update(&self, link: Link) {
        LINK_STORE.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn delete(&self, id: &LinkKey) {
        LINK_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_backend_types::repository::link::v1::{LinkState, LinkType};

    #[test]
    fn it_should_create_a_link() {
        let repo = LinkRepository::new();
        let link = Link {
            id: "link1".to_string(),
            state: LinkState::ChooseLinkType,
            title: Some("Test Link".to_string()),
            description: Some("This is a test link".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: None,
            template: None,
            creator: "creator1".to_string(),
            create_at: 1622547800,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        repo.create(link.clone());

        let fetched_link = repo.get(&link.id);
        assert!(fetched_link.is_some());
        let link_creator = fetched_link.unwrap().creator;
        assert_eq!(link_creator, "creator1");
    }

    #[test]
    fn it_should_update_a_link() {
        let repo = LinkRepository::new();
        let link = Link {
            id: "link1".to_string(),
            state: LinkState::ChooseLinkType,
            title: Some("Test Link".to_string()),
            description: Some("This is a test link".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: None,
            template: None,
            creator: "creator1".to_string(),
            create_at: 1622547800,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        repo.create(link);

        let updated_link = Link {
            id: "link1".to_string(),
            state: LinkState::Active,
            title: Some("Updated Test Link".to_string()),
            description: Some("This is an updated test link".to_string()),
            link_type: Some(LinkType::ReceivePayment),
            asset_info: None,
            template: None,
            creator: "creator2".to_string(),
            create_at: 1622547800,
            metadata: None,
            link_use_action_counter: 1,
            link_use_action_max_count: 20,
        };
        repo.update(updated_link.clone());

        let fetched_link = repo.get(&updated_link.id);
        assert!(fetched_link.is_some());
        let fetched_link = fetched_link.unwrap();
        assert_eq!(fetched_link.state, LinkState::Active);
        assert_eq!(fetched_link.creator, "creator2");
    }

    #[test]
    fn it_should_delete_a_link() {
        let repo = LinkRepository::new();
        let link = Link {
            id: "link1".to_string(),
            state: LinkState::ChooseLinkType,
            title: Some("Test Link".to_string()),
            description: Some("This is a test link".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: None,
            template: None,
            creator: "creator1".to_string(),
            create_at: 1622547800,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        repo.create(link.clone());

        repo.delete(&link.id);
        let fetched_link = repo.get(&link.id);
        assert!(fetched_link.is_none());
    }

    #[test]
    fn it_should_get_batch_of_links() {
        let repo = LinkRepository::new();
        let link1 = Link {
            id: "link1".to_string(),
            state: LinkState::ChooseLinkType,
            title: Some("Test Link 1".to_string()),
            description: Some("This is a test link 1".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: None,
            template: None,
            creator: "creator1".to_string(),
            create_at: 1622547800,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        let link2 = Link {
            id: "link2".to_string(),
            state: LinkState::Active,
            title: Some("Test Link 2".to_string()),
            description: Some("This is a test link 2".to_string()),
            link_type: Some(LinkType::ReceivePayment),
            asset_info: None,
            template: None,
            creator: "creator2".to_string(),
            create_at: 1622547800,
            metadata: None,
            link_use_action_counter: 1,
            link_use_action_max_count: 20,
        };
        repo.create(link1);
        repo.create(link2);

        let ids = vec!["link1".to_string(), "link2".to_string()];
        let fetched_links = repo.get_batch(ids);
        assert_eq!(fetched_links.len(), 2);
        assert_eq!(fetched_links.first().unwrap().id, "link1");
        assert_eq!(fetched_links.get(1).unwrap().id, "link2");
    }

    #[test]
    fn it_should_get_a_link() {
        let repo = LinkRepository::new();
        let link = Link {
            id: "link1".to_string(),
            state: LinkState::ChooseLinkType,
            title: Some("Test Link".to_string()),
            description: Some("This is a test link".to_string()),
            link_type: Some(LinkType::SendTip),
            asset_info: None,
            template: None,
            creator: "creator1".to_string(),
            create_at: 1622547800,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 10,
        };
        repo.create(link.clone());

        let fetched_link = repo.get(&link.id);
        assert!(fetched_link.is_some());
        assert_eq!(fetched_link.unwrap().id, "link1");
    }

    #[test]
    fn it_should_create_a_link_repository_by_default() {
        let repo = LinkRepository::default();
        assert!(repo.get(&"default_link".to_string()).is_none());
    }
}
