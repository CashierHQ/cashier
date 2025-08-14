// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, thread::LocalKey};

use crate::{repository::BalanceCache, types::{Candid, TokenBalance}};
use candid::Principal;
use ic_cdk::api::time;
use ic_mple_utils::store::Storage;
use ic_stable_structures::{memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap};
use token_storage_types::TokenId;

/// Store for balance cache repository
pub type BalanceCacheRepositoryStorage = StableBTreeMap<Principal, BalanceCache, VirtualMemory<DefaultMemoryImpl>>;
pub type ThreadlocalBalanceCacheRepositoryStorage = &'static LocalKey<RefCell<BalanceCacheRepositoryStorage>>;

pub struct BalanceCacheRepository<S: Storage<BalanceCacheRepositoryStorage>> {
    balance_store: S,
}

impl BalanceCacheRepository<ThreadlocalBalanceCacheRepositoryStorage> {

    /// Create a new BalanceCacheRepository
    pub fn new() -> Self {
        Self::new_with_storage(&super::BALANCE_CACHE_STORE)
    }
}

impl <S: Storage<BalanceCacheRepositoryStorage>> BalanceCacheRepository<S> {

    /// Create a new BalanceCacheRepository
    pub fn new_with_storage(storage: S) -> Self {
        Self {
            balance_store: storage
        }
    }

    pub fn update_bulk_balances(&mut self, user_id: Principal, token_balances: Vec<(TokenId, u128)>) {
        self.balance_store.with_borrow_mut(|store| {
            // Get existing balances or create new HashMap
            let mut balance_map = store
                .get(&user_id)
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
            store.insert(user_id, Candid(balance_map));
        });
    }

    pub fn get_all_balances(&self, user_id: &Principal) -> Vec<(TokenId, u128)> {
        self.balance_store.with_borrow(|store| {
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
