// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    repository::user_link::v1::UserLink,
    service::link::{PaginateInput, PaginateResult, PaginateResultMetadata},
};
use ic_mple_log::service::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, memory_manager::VirtualMemory};

pub type UserLinkRepositoryStorage =
    StableBTreeMap<String, UserLink, VirtualMemory<DefaultMemoryImpl>>;

struct UserLinkKey<'a> {
    pub user_id: &'a Principal,
    pub link_id: &'a str,
}

impl<'a> UserLinkKey<'a> {
    pub fn to_str(&self) -> String {
        format!("USER#{}#LINK#{}", self.user_id, self.link_id)
    }
}

#[derive(Clone)]
pub struct UserLinkRepository<S: Storage<UserLinkRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<UserLinkRepositoryStorage>> UserLinkRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, user_link: UserLink) {
        self.storage.with_borrow_mut(|store| {
            let id: UserLinkKey = UserLinkKey {
                user_id: &user_link.user_id,
                link_id: &user_link.link_id,
            };
            store.insert(id.to_str(), user_link);
        });
    }

    pub fn delete(&mut self, id: &UserLink) {
        let id = UserLinkKey {
            user_id: &id.user_id,
            link_id: &id.link_id,
        };
        self.storage
            .with_borrow_mut(|store| store.remove(&id.to_str()));
    }

    pub fn get_links_by_user_id(
        &self,
        user_id: &Principal,
        paginate: &PaginateInput,
    ) -> PaginateResult<UserLink> {
        self.storage.with_borrow(|store| {
            let user_link_key = UserLinkKey {
                user_id,
                link_id: "",
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
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::*,
    };

    #[test]
    fn test_link_to_str() {
        let user_id = Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").unwrap();
        let link_id = "link_id";
        let key = UserLinkKey {
            user_id: &user_id,
            link_id,
        };
        assert_eq!(
            key.to_str(),
            "USER#rdmx6-jaaaa-aaaaa-aaadq-cai#LINK#link_id"
        );
    }

    #[test]
    fn it_should_create_an_user_link() {
        // Arrange
        let mut repo = TestRepositories::new().user_link();
        let user_id = random_principal_id();
        let link_id = random_id_string();
        let user_link = UserLink {
            user_id,
            link_id: link_id.clone(),
        };

        // Act
        repo.create(user_link);

        // Assert
        let links = repo.get_links_by_user_id(&user_id, &PaginateInput::default());
        assert_eq!(links.data.len(), 1);
        assert_eq!(links.data.first().unwrap().link_id, link_id);
        assert_eq!(links.data.first().unwrap().user_id, user_id);
    }

    #[test]
    fn it_should_delete_a_user_link() {
        // Arrange
        let mut repo = TestRepositories::new().user_link();
        let user_id = random_principal_id();
        let link_id = random_id_string();

        let user_link = UserLink { user_id, link_id };

        repo.create(user_link.clone());

        // Act
        repo.delete(&user_link);

        // Assert
        let links = repo.get_links_by_user_id(&user_id, &PaginateInput::default());
        assert!(links.data.is_empty());
    }

    #[test]
    fn it_should_get_links_by_user_id() {
        // Arrange
        let mut repo = TestRepositories::new().user_link();
        let user_id = random_principal_id();
        let link_id1 = random_id_string();
        let link_id2 = random_id_string();
        let user_link1 = UserLink {
            user_id,
            link_id: link_id1.clone(),
        };
        let user_link2 = UserLink {
            user_id,
            link_id: link_id2.clone(),
        };

        repo.create(user_link1);
        repo.create(user_link2);

        // Act
        let links = repo.get_links_by_user_id(&user_id, &PaginateInput::default());

        // Assert
        assert_eq!(links.data.len(), 2);
        assert!(links.data.iter().any(|l| l.link_id == link_id1));
        assert!(links.data.iter().any(|l| l.link_id == link_id2));
    }
}
