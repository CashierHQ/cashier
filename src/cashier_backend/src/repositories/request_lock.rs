// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{keys::RequestLockKey, request_lock::RequestLock};

use super::REQUEST_LOCK_STORE;

pub struct RequestLockRepository {}

impl Default for RequestLockRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl RequestLockRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, request_lock: RequestLock) {
        REQUEST_LOCK_STORE.with_borrow_mut(|store| {
            store.insert(request_lock.key.clone(), request_lock);
        });
    }

    pub fn delete(&self, key: &RequestLockKey) {
        REQUEST_LOCK_STORE.with_borrow_mut(|store| {
            store.remove(key);
        });
    }

    pub fn exists(&self, key: &RequestLockKey) -> bool {
        REQUEST_LOCK_STORE.with_borrow(|store| store.contains_key(key))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::*;
    use cashier_backend_types::repository::request_lock::RequestLock;

    #[test]
    fn it_should_create_a_request_lock() {
        // Arrange
        let repo = RequestLockRepository::new();
        let user_principal_id = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let request_lock = RequestLock {
            key: RequestLockKey::UserLinkAction {
                user_principal: user_principal_id,
                link_id,
                action_id,
            },
            timestamp: 1622547800,
        };

        // Act
        repo.create(request_lock.clone());

        // Assert
        let exists = repo.exists(&request_lock.key);
        assert!(exists);

        let retrieved = REQUEST_LOCK_STORE.with_borrow(|store| store.get(&request_lock.key));
        let retrieved = retrieved.expect("Request lock should exist");
        assert_eq!(retrieved.key, request_lock.key);
        assert_eq!(retrieved.timestamp, 1622547800);
    }

    #[test]
    fn it_should_delete_a_request_lock() {
        // Arrange
        let repo = RequestLockRepository::new();
        let user_principal_id = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let request_lock = RequestLock {
            key: RequestLockKey::UserLinkAction {
                user_principal: user_principal_id,
                link_id,
                action_id,
            },
            timestamp: 1622547800,
        };
        repo.create(request_lock.clone());

        // Act
        repo.delete(&request_lock.key);
        
        // Assert
        let exists = repo.exists(&request_lock.key);
        assert!(!exists);
    }

    #[test]
    fn it_should_check_if_a_request_lock_exists() {
        // Arrange
        let repo = RequestLockRepository::new();
        let user_principal_id = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let request_lock = RequestLock {
            key: RequestLockKey::UserLinkAction {
                user_principal: user_principal_id,
                link_id,
                action_id,
            },
            timestamp: 1622547800,
        };
        repo.create(request_lock.clone());

        // Act
        let exists = repo.exists(&request_lock.key);
        
        // Assert
        assert!(exists);
    }

    #[test]
    fn it_should_create_a_request_lock_repository_by_default() {
        // Arrange
        let repo = RequestLockRepository::default();

        // Act
        let result = repo.exists(&RequestLockKey::UserLinkAction {
            user_principal: "default".to_string(),
            link_id: "default".to_string(),
            action_id: "default".to_string()
        });

        // Assert
        assert!(!result);
    }
}
