// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{keys::RequestLockKey, request_lock::RequestLock},
};

use crate::repositories::{Repositories, request_lock::RequestLockRepository};

pub struct RequestLockService<R: Repositories> {
    request_lock_repository: RequestLockRepository<R::RequestLock>,
}

impl<R: Repositories> RequestLockService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            request_lock_repository: repo.request_lock(),
        }
    }

    pub fn create_request_lock_for_executing_transaction(
        &mut self,
        principal: &Principal,
        action_id: &str,
        transaction_id: &str,
        timestamp: u64,
    ) -> Result<RequestLockKey, CanisterError> {
        let key =
            RequestLockKey::user_action_transaction(principal.to_text(), action_id, transaction_id);
        self.create(&key, timestamp)
    }

    pub fn create_request_lock_for_creating_action(
        &mut self,
        link_id: &str,
        principal: &Principal,
        timestamp: u64,
    ) -> Result<RequestLockKey, CanisterError> {
        let key = RequestLockKey::user_link(principal.to_text(), link_id);
        self.create(&key, timestamp)
    }

    pub fn create_request_lock_for_processing_action(
        &mut self,
        principal: &Principal,
        link_id: &str,
        action_id: &str,
        timestamp: u64,
    ) -> Result<RequestLockKey, CanisterError> {
        let key = RequestLockKey::user_link_action(principal.to_text(), link_id, action_id);
        self.create(&key, timestamp)
    }

    pub fn create_request_lock_for_updating_action(
        &mut self,
        principal: &Principal,
        link_id: &str,
        action_id: &str,
        timestamp: u64,
    ) -> Result<RequestLockKey, CanisterError> {
        let key = RequestLockKey::user_link_action(principal.to_text(), link_id, action_id);
        self.create(&key, timestamp)
    }

    /// Create a new request lock
    /// Returns Ok(()) if lock was created successfully
    /// Returns Err if lock already exists
    pub fn create(
        &mut self,
        key: &RequestLockKey,
        timestamp: u64,
    ) -> Result<RequestLockKey, CanisterError> {
        // Check if lock already exists
        if self.request_lock_repository.exists(key) {
            return Err(CanisterError::ValidationErrors(format!(
                "Request lock already exists for key: {key:?}"
            )));
        }
        let request_lock = RequestLock::new(key.to_owned(), timestamp);

        self.request_lock_repository.create(request_lock);

        Ok(key.to_owned())
    }

    /// Drop (delete) a request lock
    /// Returns Ok(()) regardless of whether the lock existed
    pub fn drop(&mut self, key: &RequestLockKey) -> Result<(), CanisterError> {
        self.request_lock_repository.delete(key);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use crate::utils::test_utils::{random_id_string, random_principal_id};

    #[test]
    fn it_should_error_create_request_lock_for_executing_transaction_if_lock_exists() {
        // Arrange
        let mut service = RequestLockService::new(&TestRepositories::new());
        let principal_id = random_principal_id();
        let principal = Principal::from_text(principal_id.clone()).unwrap();
        let action_id = random_id_string();
        let transaction_id = random_id_string();
        let timestamp = 1622547800;

        let key = RequestLockKey::user_action_transaction(
            principal_id,
            action_id.clone(),
            transaction_id.clone(),
        );
        service
            .request_lock_repository
            .create(RequestLock { key, timestamp });

        // Act
        let result = service.create_request_lock_for_executing_transaction(
            &principal,
            &action_id,
            &transaction_id,
            timestamp,
        );

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Request lock already exists for key"));
        } else {
            panic!("Expected CanisterError::ValidationErrors");
        }
    }

    #[test]
    fn it_should_create_request_lock_for_executing_transaction() {
        // Arrange
        let mut service = RequestLockService::new(&TestRepositories::new());
        let principal_id = random_principal_id();
        let principal = Principal::from_text(principal_id.clone()).unwrap();
        let action_id = random_id_string();
        let transaction_id = random_id_string();
        let timestamp = 1622547800;

        // Act
        let result = service.create_request_lock_for_executing_transaction(
            &principal,
            &action_id,
            &transaction_id,
            timestamp,
        );

        // Assert
        assert!(result.is_ok());
        if let Ok(key) = result {
            assert_eq!(
                key,
                RequestLockKey::user_action_transaction(principal_id, action_id, transaction_id)
            );
        }
    }

    #[test]
    fn it_should_error_create_request_lock_for_creating_action_if_lock_exists() {
        // Arrange
        let mut service = RequestLockService::new(&TestRepositories::new());
        let principal_id = random_principal_id();
        let principal = Principal::from_text(principal_id.clone()).unwrap();
        let link_id = random_id_string();
        let timestamp = 1622547800;

        let key = RequestLockKey::user_link(principal_id, link_id.clone());
        service
            .request_lock_repository
            .create(RequestLock { key, timestamp });

        // Act
        let result =
            service.create_request_lock_for_creating_action(&link_id, &principal, timestamp);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Request lock already exists for key"));
        } else {
            panic!("Expected CanisterError::ValidationErrors");
        }
    }

    #[test]
    fn it_should_create_request_lock_for_creating_action() {
        // Arrange
        let mut service = RequestLockService::new(&TestRepositories::new());
        let principal_id = random_principal_id();
        let principal = Principal::from_text(principal_id.clone()).unwrap();
        let link_id = random_id_string();
        let timestamp = 1622547800;

        // Act
        let result =
            service.create_request_lock_for_creating_action(&link_id, &principal, timestamp);

        // Assert
        assert!(result.is_ok());
        if let Ok(key) = result {
            assert_eq!(key, RequestLockKey::user_link(principal_id, link_id));
        }
    }

    #[test]
    fn it_should_error_create_request_lock_for_processing_action_if_lock_exists() {
        // Arrange
        let mut service = RequestLockService::new(&TestRepositories::new());
        let principal_id = random_principal_id();
        let principal = Principal::from_text(principal_id.clone()).unwrap();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let timestamp = 1622547800;

        let key =
            RequestLockKey::user_link_action(principal_id, link_id.clone(), action_id.clone());
        service
            .request_lock_repository
            .create(RequestLock { key, timestamp });

        // Act
        let result = service
            .create_request_lock_for_processing_action(&principal, &link_id, &action_id, timestamp);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Request lock already exists for key"));
        } else {
            panic!("Expected CanisterError::ValidationErrors");
        }
    }

    #[test]
    fn it_should_create_request_lock_for_processing_action() {
        // Arrange
        let mut service = RequestLockService::new(&TestRepositories::new());
        let principal_id = random_principal_id();
        let principal = Principal::from_text(principal_id.clone()).unwrap();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let timestamp = 1622547800;

        // Act
        let result = service
            .create_request_lock_for_processing_action(&principal, &link_id, &action_id, timestamp);

        // Assert
        assert!(result.is_ok());
        if let Ok(key) = result {
            assert_eq!(
                key,
                RequestLockKey::user_link_action(principal_id, link_id, action_id)
            );
        }
    }

    #[test]
    fn it_should_error_create_request_lock_for_updating_action_if_lock_exists() {
        // Arrange
        let mut service = RequestLockService::new(&TestRepositories::new());
        let principal_id = random_principal_id();
        let principal = Principal::from_text(principal_id.clone()).unwrap();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let timestamp = 1622547800;

        let key =
            RequestLockKey::user_link_action(principal_id, link_id.clone(), action_id.clone());
        service
            .request_lock_repository
            .create(RequestLock { key, timestamp });

        // Act
        let result = service
            .create_request_lock_for_updating_action(&principal, &link_id, &action_id, timestamp);

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Request lock already exists for key"));
        } else {
            panic!("Expected CanisterError::ValidationErrors");
        }
    }

    #[test]
    fn it_should_create_request_lock_for_updating_action() {
        // Arrange
        let mut service = RequestLockService::new(&TestRepositories::new());
        let principal_id = random_principal_id();
        let principal = Principal::from_text(principal_id.clone()).unwrap();
        let link_id = random_id_string();
        let action_id = random_id_string();
        let timestamp = 1622547800;

        // Act
        let result = service
            .create_request_lock_for_updating_action(&principal, &link_id, &action_id, timestamp);

        // Assert
        assert!(result.is_ok());
        if let Ok(key) = result {
            assert_eq!(
                key,
                RequestLockKey::user_link_action(principal_id, link_id, action_id)
            );
        }
    }
}
