// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_types::{keys::RequestLockKey, request_lock::RequestLock};

use crate::{repositories::request_lock::RequestLockRepository, types::error::CanisterError};

pub struct RequestLockService {
    request_lock_repository: RequestLockRepository,
}

impl RequestLockService {
    pub fn new(request_lock_repository: RequestLockRepository) -> Self {
        Self {
            request_lock_repository,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(RequestLockRepository::new())
    }

    pub fn create_request_lock_for_executing_transaction(
        &self,
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
        &self,
        link_id: &str,
        principal: &Principal,
        timestamp: u64,
    ) -> Result<RequestLockKey, CanisterError> {
        let key = RequestLockKey::user_link(principal.to_text(), link_id);
        self.create(&key, timestamp)
    }

    pub fn create_request_lock_for_processing_action(
        &self,
        principal: &Principal,
        link_id: &str,
        action_id: &str,
        timestamp: u64,
    ) -> Result<RequestLockKey, CanisterError> {
        let key = RequestLockKey::user_link_action(principal.to_text(), link_id, action_id);
        self.create(&key, timestamp)
    }

    pub fn create_request_lock_for_updating_action(
        &self,
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
        &self,
        key: &RequestLockKey,
        timestamp: u64,
    ) -> Result<RequestLockKey, CanisterError> {
        // Check if lock already exists
        if self.request_lock_repository.exists(key) {
            return Err(CanisterError::ValidationErrors(format!(
                "Request lock already exists for key: {:?}",
                key
            )));
        }
        let request_lock = RequestLock::new(key.to_owned(), timestamp);

        self.request_lock_repository.create(request_lock);

        Ok(key.to_owned())
    }

    /// Drop (delete) a request lock
    /// Returns Ok(()) regardless of whether the lock existed
    pub fn drop(&self, key: &RequestLockKey) -> Result<(), CanisterError> {
        self.request_lock_repository.delete(key);
        Ok(())
    }

    /// Get a request lock by key
    /// Returns Some(RequestLock) if found, None if not found
    pub fn get(&self, key: &RequestLockKey) -> Result<Option<RequestLock>, CanisterError> {
        let lock = self.request_lock_repository.get(key);
        Ok(lock)
    }
}
