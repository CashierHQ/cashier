// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


// File: src/token_storage/src/repository/balance_cache.rs
use super::BALANCE_CACHE_STORE;
use crate::types::{Candid, TokenBalance, TokenId};
use ic_cdk::api::time;
use std::collections::HashMap;

pub struct BalanceCacheRepository {}

impl Default for BalanceCacheRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl BalanceCacheRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn update_bulk_balances(&self, user_id: &str, token_balances: Vec<(String, u128)>) {
        BALANCE_CACHE_STORE.with_borrow_mut(|store| {
            // Get existing balances or create new HashMap
            let mut balance_map = store
                .get(&user_id.to_string())
                .map(|candid| candid.into_inner())
                .unwrap_or_default();

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
            store.insert(user_id.to_string(), Candid(balance_map));
        });
    }

    pub fn update_balance(&self, user_id: &str, token_id: TokenId, balance: u128) {
        BALANCE_CACHE_STORE.with_borrow_mut(|store| {
            // Get existing balances or create new HashMap
            let mut balance_map = store
                .get(&user_id.to_string())
                .map(|candid| candid.into_inner())
                .unwrap_or_default();

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
            store.insert(user_id.to_string(), Candid(balance_map));
        });
    }

    pub fn get_balance(&self, user_id: &str, token_id: &TokenId) -> Option<u128> {
        BALANCE_CACHE_STORE.with_borrow(|store| {
            store
                .get(&user_id.to_string())
                .and_then(|Candid(balances)| {
                    balances
                        .get(token_id)
                        .map(|balance| balance.balance)
                })
        })
    }

    pub fn get_all_balances(&self, user_id: &str) -> Vec<(TokenId, u128)> {
        BALANCE_CACHE_STORE.with_borrow(|store| {
            store
                .get(&user_id.to_string())
                .map(|Candid(balances)| {
                    balances
                        .into_iter()
                        .map(|(token_id, balance)| (token_id, balance.balance))
                        .collect()
                })
                .unwrap_or_default()
        })
    }

    pub fn reset_balances(&self, user_id: &str) {
        BALANCE_CACHE_STORE.with_borrow_mut(|store| {
            store.remove(&user_id.to_string());
            store.insert(
                user_id.to_string(),
                Candid(HashMap::<TokenId, TokenBalance>::new()),
            );
        });
    }

    pub fn get_balances_batch(
        &self,
        user_id: &str,
        token_ids: Vec<TokenId>,
    ) -> HashMap<TokenId, u128> {
        BALANCE_CACHE_STORE.with_borrow(|store| {
            store
                .get(&user_id.to_string())
                .map(|Candid(balances)| {
                    balances
                        .into_iter()
                        .filter(|(token_id, _)| token_ids.contains(token_id))
                        .map(|(token_id, balance)| (token_id, balance.balance))
                        .collect()
                })
                .unwrap_or_default()
        })
    }
}
