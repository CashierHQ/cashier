// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! Token fee fetcher abstraction for external canister calls.

use candid::{Nat, Principal};
use cashier_backend_types::error::CanisterError;
use transaction_manager::icrc_token::service::IcrcService;

use crate::apps::token_fee::traits::TokenFetcher;

/// Real implementation using IcrcService for canister calls
#[derive(Clone, Default)]
pub struct IcrcTokenFetcher;

impl IcrcTokenFetcher {
    pub fn new() -> Self {
        Self
    }
}

impl TokenFetcher for IcrcTokenFetcher {
    async fn fetch_fee(&self, address: Principal) -> Result<Nat, CanisterError> {
        IcrcService::new(address).icrc_1_fee().await
    }
}

#[cfg(test)]
pub mod test_utils {
    use super::*;
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    /// Mock token fetcher for testing.
    /// Configure responses via `set_fee` or `set_error`.
    #[derive(Clone, Default)]
    pub struct MockTokenFetcher {
        /// Pre-configured fee responses by principal
        fees: Arc<Mutex<HashMap<Principal, Nat>>>,
        /// Pre-configured error responses by principal
        errors: Arc<Mutex<HashMap<Principal, String>>>,
        /// Track fetch calls for assertions
        call_count: Arc<Mutex<HashMap<Principal, u32>>>,
    }

    impl MockTokenFetcher {
        pub fn new() -> Self {
            Self::default()
        }

        /// Set fee response for given token address
        pub fn set_fee(&self, address: Principal, fee: Nat) {
            self.fees.lock().unwrap().insert(address, fee);
        }

        /// Set error response for given token address
        pub fn set_error(&self, address: Principal, error: &str) {
            self.errors
                .lock()
                .unwrap()
                .insert(address, error.to_string());
        }

        /// Get call count for specific token
        pub fn get_call_count(&self, address: &Principal) -> u32 {
            *self.call_count.lock().unwrap().get(address).unwrap_or(&0)
        }

        /// Get total call count across all tokens
        #[allow(dead_code)]
        pub fn total_call_count(&self) -> u32 {
            self.call_count.lock().unwrap().values().sum()
        }
    }

    impl TokenFetcher for MockTokenFetcher {
        async fn fetch_fee(&self, address: Principal) -> Result<Nat, CanisterError> {
            // Track call
            *self.call_count.lock().unwrap().entry(address).or_insert(0) += 1;

            // Check for error first
            if let Some(err) = self.errors.lock().unwrap().get(&address).cloned() {
                return Err(CanisterError::CallCanisterFailed(err));
            }

            // Return configured fee or default
            Ok(self
                .fees
                .lock()
                .unwrap()
                .get(&address)
                .cloned()
                .unwrap_or_else(|| Nat::from(10000u64)))
        }
    }
}
