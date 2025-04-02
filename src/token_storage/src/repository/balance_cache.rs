// File: src/token_storage/src/repository/balance_cache.rs
use super::BALANCE_CACHE_STORE;
use crate::types::{Candid, TokenBalance, TokenId};
use ic_cdk::api::time;

const CACHE_EXPIRY_NANOS: u64 = 60_000_000_000; // 1 minute in nanoseconds

pub struct BalanceCacheRepository {}

impl BalanceCacheRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn update_balance(&self, user_id: String, token_id: TokenId, balance: String) {
        BALANCE_CACHE_STORE.with_borrow_mut(|store| {
            let balances = store.get(&user_id).unwrap_or_default();
            let mut balance_list = balances.into_inner();

            // Find and update existing balance or add new one
            let now = time();
            if let Some(pos) = balance_list.iter().position(|b| b.token_id == token_id) {
                balance_list[pos] = TokenBalance {
                    token_id: token_id.clone(),
                    balance,
                    last_updated: now,
                };
            } else {
                balance_list.push(TokenBalance {
                    token_id: token_id.clone(),
                    balance,
                    last_updated: now,
                });
            }

            store.insert(user_id, Candid(balance_list));
        });
    }

    pub fn get_balance(&self, user_id: &String, token_id: &TokenId) -> Option<String> {
        BALANCE_CACHE_STORE.with_borrow(|store| {
            let now = time();
            store.get(user_id).and_then(|Candid(balances)| {
                balances
                    .into_iter()
                    .find(|b| &b.token_id == token_id && now - b.last_updated < CACHE_EXPIRY_NANOS)
                    .map(|b| b.balance)
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
                        .filter(|b| now - b.last_updated < CACHE_EXPIRY_NANOS)
                        .map(|b| (b.token_id, b.balance))
                        .collect()
                })
                .unwrap_or_default()
        })
    }

    pub fn clear_expired_balances(&self, user_id: &String) {
        BALANCE_CACHE_STORE.with_borrow_mut(|store| {
            if let Some(Candid(balances)) = store.get(user_id) {
                let now = time();
                let valid_balances: Vec<TokenBalance> = balances
                    .into_iter()
                    .filter(|b| now - b.last_updated < CACHE_EXPIRY_NANOS)
                    .collect();

                store.insert(user_id.clone(), Candid(valid_balances));
            }
        });
    }
}
