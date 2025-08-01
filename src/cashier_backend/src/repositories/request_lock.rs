// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::repository::{keys::RequestLockKey, request_lock::RequestLock};

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

    pub fn get(&self, key: &RequestLockKey) -> Option<RequestLock> {
        REQUEST_LOCK_STORE.with_borrow(|store| store.get(key))
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
