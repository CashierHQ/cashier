// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::keys::RateLimitKey;
use cashier_types::rate_limit::RateLimitEntry;

use super::RATE_LIMIT_STORE;

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
        RATE_LIMIT_STORE.with_borrow(|store| store.get(&key.to_str()).cloned())
    }

    /// Scan and get all entries that match a prefix
    /// Returns a vector of tuples containing (key, entry)
    pub fn scan_with_prefix(&self, prefix: &str) -> Vec<(String, RateLimitEntry)> {
        RATE_LIMIT_STORE.with_borrow(|store| {
            store
                .iter()
                .filter(|(key, _)| key.starts_with(prefix))
                .map(|(key, entry)| (key.clone(), entry.clone()))
                .collect()
        })
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
        RATE_LIMIT_STORE.with_borrow_mut(|store| store.remove(key_str))
    }

    /// Check if a key exists
    pub fn exists(&self, key: &RateLimitKey) -> bool {
        RATE_LIMIT_STORE.with_borrow(|store| store.contains_key(&key.to_str()))
    }

    /// Clear all rate limit entries
    pub fn clear_all(&self) {
        RATE_LIMIT_STORE.with_borrow_mut(|store| {
            store.clear();
        })
    }

    /// Get the total count of rate limit entries
    pub fn count(&self) -> usize {
        RATE_LIMIT_STORE.with_borrow(|store| store.len())
    }

    /// Get all entries for a specific time window
    pub fn get_entries_by_time_window(&self, time_window: u64) -> Vec<(String, RateLimitEntry)> {
        let prefix = format!("WINDOW#{}", time_window);
        self.scan_with_prefix(&prefix)
    }

    /// Get all entries for a specific method across all time windows
    pub fn get_entries_by_method(&self, method: &str) -> Vec<(String, RateLimitEntry)> {
        RATE_LIMIT_STORE.with_borrow(|store| {
            store
                .iter()
                .filter(|(key, _)| key.contains(&format!("METHOD#{}", method)))
                .map(|(key, entry)| (key.clone(), entry.clone()))
                .collect()
        })
    }

    /// Get all entries for a specific user across all time windows and methods
    pub fn get_entries_by_user(&self, user_principal: &str) -> Vec<(String, RateLimitEntry)> {
        let user_suffix = format!("USER#{}", user_principal);
        RATE_LIMIT_STORE.with_borrow(|store| {
            store
                .iter()
                .filter(|(key, _)| key.ends_with(&user_suffix))
                .map(|(key, entry)| (key.clone(), entry.clone()))
                .collect()
        })
    }

    /// Delete all entries for a specific time window (useful for cleanup)
    pub fn delete_entries_by_time_window(&self, time_window: u64) -> Vec<(String, RateLimitEntry)> {
        let prefix = format!("WINDOW#{}", time_window);
        let keys_to_delete: Vec<String> = RATE_LIMIT_STORE.with_borrow(|store| {
            store
                .keys()
                .filter(|key| key.starts_with(&prefix))
                .cloned()
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
