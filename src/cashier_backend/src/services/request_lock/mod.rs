// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
