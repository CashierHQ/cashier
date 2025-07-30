// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::keys::RateLimitKey;
use cashier_types::rate_limit::RateLimitEntry;

use super::RATE_LIMIT_STORE;

pub trait RateLimitRepositoryTrait {
    fn new() -> Self;
    fn get(&self, key: &RateLimitKey) -> Option<RateLimitEntry>;
    fn insert(&self, key: RateLimitKey, entry: RateLimitEntry);
    fn update(&self, key: RateLimitKey, entry: RateLimitEntry) -> Option<RateLimitEntry>;
    fn delete(&self, key: &RateLimitKey) -> Option<RateLimitEntry>;
    fn delete_by_key_str(&self, key_str: &str) -> Option<RateLimitEntry>;
    fn exists(&self, key: &RateLimitKey) -> bool;
    fn cleanup_expired(&self, cutoff_time_ns: u64) -> Vec<(String, RateLimitEntry)>;
}

#[derive(Clone)]
pub struct RateLimitRepository {}

impl Default for RateLimitRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl RateLimitRepository {
    pub fn new() -> Self {
        Self {}
    }

    /// Get a rate limit entry by exact key
    pub fn get(&self, key: &RateLimitKey) -> Option<RateLimitEntry> {
        RATE_LIMIT_STORE.with_borrow(|store| store.get(&key.to_str()))
    }

    /// Insert a new rate limit entry
    pub fn insert(&self, key: RateLimitKey, entry: RateLimitEntry) {
        RATE_LIMIT_STORE.with_borrow_mut(|store| {
            store.insert(key.to_str(), entry);
        });
    }

    /// Update an existing rate limit entry (returns the old value if it existed)
    pub fn update(&self, key: RateLimitKey, entry: RateLimitEntry) -> Option<RateLimitEntry> {
        RATE_LIMIT_STORE.with_borrow_mut(|store| store.insert(key.to_str(), entry))
    }

    /// Delete a rate limit entry by key (returns the deleted value if it existed)
    pub fn delete(&self, key: &RateLimitKey) -> Option<RateLimitEntry> {
        RATE_LIMIT_STORE.with_borrow_mut(|store| store.remove(&key.to_str()))
    }

    /// Delete a rate limit entry by string key (returns the deleted value if it existed)
    pub fn delete_by_key_str(&self, key_str: &str) -> Option<RateLimitEntry> {
        RATE_LIMIT_STORE.with_borrow_mut(|store| store.remove(&key_str.to_string()))
    }

    /// Check if a key exists
    pub fn exists(&self, key: &RateLimitKey) -> bool {
        RATE_LIMIT_STORE.with_borrow(|store| store.contains_key(&key.to_str()))
    }

    /// Clean up expired rate limit entries
    /// Removes all entries where the end_time is less than or equal to the cutoff_time_ns
    pub fn cleanup_expired(&self, cutoff_time_ns: u64) -> Vec<(String, RateLimitEntry)> {
        let keys_to_delete: Vec<String> = RATE_LIMIT_STORE.with_borrow(|store| {
            store
                .iter()
                .filter(|(_, entry)| entry.end_time <= cutoff_time_ns)
                .map(|(key, _)| key.clone())
                .collect()
        });

        let mut deleted_entries = Vec::new();
        for key in keys_to_delete {
            if let Some(entry) = RATE_LIMIT_STORE.with_borrow_mut(|store| store.remove(&key)) {
                deleted_entries.push((key, entry));
            }
        }
        deleted_entries
    }
}

impl RateLimitRepositoryTrait for RateLimitRepository {
    fn new() -> Self {
        Self::new()
    }
    fn get(&self, key: &RateLimitKey) -> Option<RateLimitEntry> {
        self.get(key)
    }
    fn insert(&self, key: RateLimitKey, entry: RateLimitEntry) {
        self.insert(key, entry)
    }
    fn update(&self, key: RateLimitKey, entry: RateLimitEntry) -> Option<RateLimitEntry> {
        self.update(key, entry)
    }
    fn delete(&self, key: &RateLimitKey) -> Option<RateLimitEntry> {
        self.delete(key)
    }
    fn delete_by_key_str(&self, key_str: &str) -> Option<RateLimitEntry> {
        self.delete_by_key_str(key_str)
    }
    fn exists(&self, key: &RateLimitKey) -> bool {
        self.exists(key)
    }
    fn cleanup_expired(&self, cutoff_time_ns: u64) -> Vec<(String, RateLimitEntry)> {
        self.cleanup_expired(cutoff_time_ns)
    }
}

#[cfg(test)]
pub mod test_utils {
    use super::*;

    use std::cell::RefCell;
    use std::collections::HashMap;

    #[derive(Clone, Default)]
    pub struct MockRateLimitRepository {
        pub store: RefCell<HashMap<String, RateLimitEntry>>,
    }

    impl MockRateLimitRepository {
        pub fn new() -> Self {
            Self {
                store: RefCell::new(HashMap::new()),
            }
        }
    }

    impl RateLimitRepositoryTrait for MockRateLimitRepository {
        fn new() -> Self {
            Self::new()
        }
        fn get(&self, key: &RateLimitKey) -> Option<RateLimitEntry> {
            self.store.borrow().get(&key.to_str()).cloned()
        }
        fn insert(&self, key: RateLimitKey, entry: RateLimitEntry) {
            self.store.borrow_mut().insert(key.to_str(), entry);
        }
        fn update(&self, key: RateLimitKey, entry: RateLimitEntry) -> Option<RateLimitEntry> {
            self.store.borrow_mut().insert(key.to_str(), entry)
        }
        fn delete(&self, key: &RateLimitKey) -> Option<RateLimitEntry> {
            self.store.borrow_mut().remove(&key.to_str())
        }
        fn delete_by_key_str(&self, key_str: &str) -> Option<RateLimitEntry> {
            self.store.borrow_mut().remove(key_str)
        }
        fn exists(&self, key: &RateLimitKey) -> bool {
            self.store.borrow().contains_key(&key.to_str())
        }
        fn cleanup_expired(&self, cutoff_time_ns: u64) -> Vec<(String, RateLimitEntry)> {
            let mut deleted = Vec::new();
            let mut store = self.store.borrow_mut();
            let keys: Vec<String> = store
                .iter()
                .filter(|(_, entry)| entry.end_time <= cutoff_time_ns)
                .map(|(k, _)| k.clone())
                .collect();
            for key in keys {
                if let Some(entry) = store.remove(&key) {
                    deleted.push((key, entry));
                }
            }
            deleted
        }
    }
}
