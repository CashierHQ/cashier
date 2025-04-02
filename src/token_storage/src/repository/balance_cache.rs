// File: src/token_storage/src/repository/balance_cache.rs
use super::BALANCE_CACHE_STORE;
use crate::types::{Candid, TokenBalance, TokenId};
use ic_cdk::api::time;
use std::collections::HashMap;

pub struct BalanceCacheRepository {}

impl BalanceCacheRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn update_bulk_balances(&self, user_id: String, token_balances: Vec<(String, u128)>) {
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

    pub fn update_balance(&self, user_id: String, token_id: TokenId, balance: u128) {
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

    pub fn get_balance(&self, user_id: &String, token_id: &TokenId) -> Option<u128> {
        BALANCE_CACHE_STORE.with_borrow(|store| {
            store.get(user_id).and_then(|Candid(balances)| {
                balances
                    .get(token_id)
                    .map(|balance| balance.balance.clone())
            })
        })
    }

    pub fn get_all_balances(&self, user_id: &String) -> Vec<(TokenId, u128)> {
        BALANCE_CACHE_STORE.with_borrow(|store| {
            store
                .get(user_id)
                .map(|Candid(balances)| {
                    balances
                        .into_iter()
                        .map(|(token_id, balance)| (token_id, balance.balance))
                        .collect()
                })
                .unwrap_or_default()
        })
    }
}
