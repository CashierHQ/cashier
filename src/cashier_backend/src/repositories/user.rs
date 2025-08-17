// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{keys::UserKey, user::v1::User};
use ic_mple_log::service::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, memory_manager::VirtualMemory};

pub type UserRepositoryStorage = StableBTreeMap<UserKey, User, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct UserRepository<S: Storage<UserRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<UserRepositoryStorage>> UserRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, user: User) {
        self.storage.with_borrow_mut(|store| {
            let id = user.id.clone();
            store.insert(id, user);
        });
    }

    pub fn get(&self, id: &String) -> Option<User> {
        self.storage.with_borrow(|store| store.get(id))
    }
}

#[cfg(test)]
mod tests {
    use crate::repositories::{Repositories, tests::TestRepositories};

    use super::*;

    #[test]
    fn it_should_create_an_user() {
        // Arrange
        let mut repo = TestRepositories::new().user();
        let user = User {
            id: "user1".to_string(),
            email: Some("foo@bar.com".to_string()),
        };

        // Act
        repo.create(user.clone());

        // Assert
        let retrieved_user = repo.get(&user.id);
        assert!(retrieved_user.is_some());
        assert_eq!(retrieved_user.unwrap().id, user.id);
    }

    #[test]
    fn it_should_get_a_user() {
        // Arrange
        let mut repo = TestRepositories::new().user();
        let user = User {
            id: "user1".to_string(),
            email: Some("foo@bar.com".to_string()),
        };

        repo.create(user.clone());

        // Act
        let retrieved_user = repo.get(&user.id);

        // Assert
        assert!(retrieved_user.is_some());
        assert_eq!(retrieved_user.unwrap().id, user.id);
    }
}
