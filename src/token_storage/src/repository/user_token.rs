// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, thread::LocalKey};

use candid::Principal;
use ic_mple_utils::store::Storage;
use ic_stable_structures::{memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap};
use token_storage_types::TokenId;

use crate::types::UserTokenList;

/// Store for UserTokenRepository
pub type TokenRepositoryStorage = StableBTreeMap<Principal, UserTokenList, VirtualMemory<DefaultMemoryImpl>>;
pub type ThreadlocalTokenRepositoryStorage = &'static LocalKey<RefCell<TokenRepositoryStorage>>;

pub struct TokenRepository<S: Storage<TokenRepositoryStorage>> {
    token_store: S
}

impl TokenRepository<ThreadlocalTokenRepositoryStorage> {

    /// Create a new TokenRepository
    pub fn new() -> Self {
        Self::new_with_storage( &super::USER_TOKEN_STORE)
    }
}

impl <S: Storage<TokenRepositoryStorage>> TokenRepository<S> {

    /// Create a new TokenRepository
    pub fn new_with_storage(storage: S) -> Self {
        Self {
            token_store: storage
        }
    }

    // Add token to enable list
    // return error if list token is not init
    pub fn add_token(&mut self, user_id: Principal, token_id: TokenId) -> Result<(), String> {
        self.token_store.with_borrow_mut(|store| {
            let mut user_token_list = store
                .get(&user_id)
                .ok_or_else(|| "user token list is not init".to_string())?;

            user_token_list.enable_list.insert(token_id);
            store.insert(user_id, user_token_list.clone());
            Ok(())
        })
    }

    pub fn add_bulk_tokens(&mut self, user_id: Principal, token_ids: &[TokenId]) -> Result<(), String> {
        self.token_store.with_borrow_mut(|store| {
            let mut user_token_list = store
                .get(&user_id)
                .ok_or_else(|| "user token list is not init".to_string())?;

            token_ids
                .iter()
                .all(|token_id| user_token_list.enable_list.insert(token_id.clone()));

            store.insert(user_id, user_token_list.clone());

            Ok(())
        })
    }

    pub fn list_tokens(&self, user_id: &Principal) -> Result<UserTokenList, std::string::String> {
        self.token_store.with_borrow(|store| {
            store
                .get(user_id)
                .ok_or_else(|| "user token list is not init 1".to_string())
        })
    }

    pub fn update_token(
        &mut self,
        user_id: Principal,
        token_id: TokenId,
        is_enable: bool,
    ) -> Result<(), String> {
        self.token_store.with_borrow_mut(|store| {
            let mut user_token_list = store
                .get(&user_id)
                .ok_or_else(|| "user token list is not init".to_string())?;

            if is_enable {
                user_token_list.enable_list.insert(token_id);
            } else {
                user_token_list.enable_list.remove(&token_id);
            }

            store.insert(user_id, user_token_list.clone());

            Ok(())
        })
    }

    pub fn update_token_list(
        &mut self,
        user_id: Principal,
        token_list: &UserTokenList,
    ) -> Result<(), String> {
        self.token_store.with_borrow_mut(|store| {
            // Insert the updated token list
            store.insert(user_id, token_list.clone());
            Ok(())
        })
    }
}
