// File: src/token_storage/src/repository/balance_cache.rs
use super::BALANCE_CACHE_STORE;
use crate::types::{Candid, TokenBalance, TokenId};
use ic_cdk::api::time;
use std::collections::HashMap;

const CACHE_EXPIRY_NANOS: u64 = 60_000_000_000; // 1 minute in nanoseconds

pub struct BalanceCacheRepository {}

impl BalanceCacheRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn update_bulk_balances(&self, user_id: String, token_balances: Vec<(TokenId, String)>) {
        BALANCE_CACHE_STORE.with_borrow_mut(|store| {
            // Get existing balances or create new HashMap
            let mut balance_map = store
                .get(&user_id)
                .map(|candid| candid.into_inner())
                .unwrap_or_else(|| HashMap::new());

            // Update or add new balances
            let now = time();
            for (token_id, balance) in token_balances {
                balance_map.insert(
                    token_id,
                    TokenBalance {
                        balance,
                        last_updated: now,
                    },
                );
            }

            // Store the updated map
            store.insert(user_id, Candid(balance_map));
        });
    }

    pub fn update_balance(&self, user_id: String, token_id: TokenId, balance: String) {
        BALANCE_CACHE_STORE.with_borrow_mut(|store| {
            // Get existing balances or create new HashMap
            let mut balance_map = store
                .get(&user_id)
                .map(|candid| candid.into_inner())
                .unwrap_or_else(|| HashMap::new());

            // Add or update the balance
            let now = time();
            balance_map.insert(
                token_id,
                TokenBalance {
                    balance,
                    last_updated: now,
                },
            );

            // Store the updated map
            store.insert(user_id, Candid(balance_map));
        });
    }

    pub fn get_balance(&self, user_id: &String, token_id: &TokenId) -> Option<String> {
        BALANCE_CACHE_STORE.with_borrow(|store| {
            let now = time();
            store.get(user_id).and_then(|Candid(balances)| {
                balances.get(token_id).and_then(|balance| {
                    // Check if the cache is still valid
                    if now - balance.last_updated < CACHE_EXPIRY_NANOS {
                        Some(balance.balance.clone())
                    } else {
                        None
                    }
                })
            })
        })
    }

    pub fn get_all_balances(&self, user_id: &String) -> Vec<(TokenId, String)> {
        BALANCE_CACHE_STORE.with_borrow(|store| {
            let now = time();
            store
                .get(user_id)
                .map(|Candid(balances)| {
                    balances
                        .into_iter()
                        .filter(|(_, balance)| now - balance.last_updated < CACHE_EXPIRY_NANOS)
                        .map(|(token_id, balance)| (token_id, balance.balance))
                        .collect()
                })
                .unwrap_or_default()
        })
    }

    // New method to clean expired entries (optional but recommended)
    pub fn clean_expired_entries(&self, user_id: &String) {
        BALANCE_CACHE_STORE.with_borrow_mut(|store| {
            let now = time();
            if let Some(Candid(mut balances)) = store.get(user_id) {
                // Remove expired entries
                balances.retain(|_, balance| now - balance.last_updated < CACHE_EXPIRY_NANOS);

                // Update the store if there are changes
                store.insert(user_id.clone(), Candid(balances));
            }
        });
    }
}
