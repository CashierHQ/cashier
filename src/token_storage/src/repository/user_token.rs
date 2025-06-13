// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


// File: src/token_storage/src/repository/token.rs
use super::USER_TOKEN_STORE;
use crate::types::{TokenId, UserTokenList};

pub struct TokenRepository {}

impl TokenRepository {
    pub fn new() -> Self {
        Self {}
    }

    // Add token to enable list
    // return error if list token is not init
    pub fn add_token(&self, user_id: &str, token_id: &TokenId) -> Result<(), String> {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            let mut user_token_list = store
                .get(&user_id.to_string())
                .ok_or_else(|| format!("user token list is not init"))?;

            user_token_list.enable_list.insert(token_id.to_string());
            store.insert(user_id.to_string(), user_token_list.clone());
            Ok(())
        })
    }

    pub fn add_disable_token(&self, user_id: &str, token_id: &TokenId) -> Result<(), String> {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            let mut user_token_list = store
                .get(&user_id.to_string())
                .ok_or_else(|| format!("user token list is not init"))?;

            user_token_list.disable_list.insert(token_id.to_string());

            store.insert(user_id.to_string(), user_token_list.clone());
            Ok(())
        })
    }

    pub fn add_bulk_tokens(&self, user_id: &str, token_ids: &Vec<TokenId>) -> Result<(), String> {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            let mut user_token_list = store
                .get(&user_id.to_string())
                .ok_or_else(|| format!("user token list is not init"))?;

            token_ids
                .iter()
                .all(|token_id| user_token_list.enable_list.insert(token_id.clone()));

            store.insert(user_id.to_string(), user_token_list.clone());

            Ok(())
        })
    }

    pub fn reset_token_list(&self, user_id: &str) {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            store.insert(user_id.to_string(), UserTokenList::default());
        });
    }

    pub fn list_tokens(&self, user_id: &str) -> Result<UserTokenList, std::string::String> {
        USER_TOKEN_STORE.with_borrow(|store| {
            store
                .get(&user_id.to_string())
                .ok_or_else(|| format!("user token list is not init 1"))
        })
    }

    pub fn swap_token_enable(
        &self,
        user_id: &str,
        is_enable: bool,
        token_id: &TokenId,
    ) -> Result<(), String> {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            let mut user_token_list = store
                .get(&user_id.to_string())
                .ok_or_else(|| format!("user token list is not init"))?;

            if is_enable {
                user_token_list.disable_list.remove(&token_id.to_string());
                user_token_list.enable_list.insert(token_id.to_string());
            } else {
                user_token_list.enable_list.remove(&token_id.to_string());
                user_token_list.disable_list.insert(token_id.to_string());
            }

            store.insert(user_id.to_string(), user_token_list.clone());

            return Ok(());
        })
    }

    pub fn update_token_list(
        &self,
        user_id: &str,
        token_list: &UserTokenList,
    ) -> Result<(), String> {
        USER_TOKEN_STORE.with_borrow_mut(|store| {
            // Insert the updated token list
            store.insert(user_id.to_string(), token_list.clone());
            Ok(())
        })
    }
}
