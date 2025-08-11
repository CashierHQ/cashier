// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::USER_LINK_STORE;
use cashier_types::{
    repository::{keys::UserLinkKey, user_link::v1::UserLink},
    service::link::{PaginateInput, PaginateResult, PaginateResultMetadata},
};

#[derive(Clone)]

pub struct UserLinkRepository {}

impl Default for UserLinkRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl UserLinkRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, user_link: UserLink) {
        USER_LINK_STORE.with_borrow_mut(|store| {
            let id: UserLinkKey = UserLinkKey {
                user_id: user_link.user_id.clone(),
                link_id: user_link.link_id.clone(),
            };
            store.insert(id.to_str(), user_link);
        });
    }

    pub fn delete(&self, id: UserLink) {
        let id = UserLinkKey {
            user_id: id.user_id.clone(),
            link_id: id.link_id,
        };
        USER_LINK_STORE.with_borrow_mut(|store| store.remove(&id.to_str()));
    }

    pub fn get_links_by_user_id(
        &self,
        user_id: &str,
        paginate: &PaginateInput,
    ) -> PaginateResult<UserLink> {
        USER_LINK_STORE.with_borrow(|store| {
            let user_link_key = UserLinkKey {
                user_id: user_id.to_string(),
                link_id: "".to_string(),
            };

            let prefix = user_link_key.to_str();
            let all_links: Vec<UserLink> = store
                .range(prefix.to_string()..)
                .take_while(|entry| entry.key().starts_with(&prefix))
                .map(|entry| entry.value())
                .collect();

            let total = all_links.len();
            let offset = paginate.offset;
            let limit = paginate.limit;
            let paginated_links: Vec<UserLink> =
                all_links.iter().skip(offset).take(limit).cloned().collect();

            let is_next = offset + limit < total;
            let is_prev = offset > 0;

            PaginateResult {
                data: paginated_links,
                metadata: PaginateResultMetadata {
                    total,
                    offset,
                    limit,
                    is_next,
                    is_prev,
                },
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create() {
        let repo = UserLinkRepository::new();
        let user_link = UserLink {
            user_id: "user1".to_string(),
            link_id: "link1".to_string(),
        };

        repo.create(user_link);
        let links = repo.get_links_by_user_id("user1", &PaginateInput::default());
        assert_eq!(links.data.len(), 1);
        assert_eq!(links.data[0].link_id, "link1");
        assert_eq!(links.data[0].user_id, "user1");
    }

    #[test]
    fn delete() {
        let repo = UserLinkRepository::new();
        let user_link = UserLink {
            user_id: "user1".to_string(),
            link_id: "link1".to_string(),
        };

        repo.create(user_link.clone());
        repo.delete(user_link);

        let links = repo.get_links_by_user_id("user1", &PaginateInput::default());
        assert!(links.data.is_empty());
    }

    #[test]
    fn get_links_by_user_id() {
        let repo = UserLinkRepository::new();
        let user_link1 = UserLink {
            user_id: "user1".to_string(),
            link_id: "link1".to_string(),
        };
        let user_link2 = UserLink {
            user_id: "user1".to_string(),
            link_id: "link2".to_string(),
        };

        repo.create(user_link1);
        repo.create(user_link2);

        let links = repo.get_links_by_user_id("user1", &PaginateInput::default());
        assert_eq!(links.data.len(), 2);
        assert!(links.data.iter().any(|l| l.link_id == "link1"));
        assert!(links.data.iter().any(|l| l.link_id == "link2"));
    }

    #[test]
    fn default() {
        let repo = UserLinkRepository::default();
        assert!(
            repo.get_links_by_user_id("user1", &PaginateInput::default())
                .data
                .is_empty()
        );
    }
}
