// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{cell::RefCell, thread::LocalKey};

use candid::Principal;
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, memory_manager::VirtualMemory};
use token_storage_types::TokenId;

use crate::types::UserTokenList;

/// Store for UserTokenRepository
pub type UserTokenRepositoryStorage =
    StableBTreeMap<Principal, UserTokenList, VirtualMemory<DefaultMemoryImpl>>;
pub type ThreadlocalUserTokenRepositoryStorage =
    &'static LocalKey<RefCell<UserTokenRepositoryStorage>>;

pub struct UserTokenRepository<S: Storage<UserTokenRepositoryStorage>> {
    token_store: S,
}

impl<S: Storage<UserTokenRepositoryStorage>> UserTokenRepository<S> {
    /// Create a new TokenRepository
    pub fn new(storage: S) -> Self {
        Self {
            token_store: storage,
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

    pub fn add_bulk_tokens(
        &mut self,
        user_id: Principal,
        token_ids: &[TokenId],
    ) -> Result<(), String> {
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

#[cfg(test)]
mod tests {

    use super::*;
    use crate::repository::{Repositories, tests::TestRepositories};

    #[test]
    fn it_should_update_the_token_list() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let version = 1;
        let token_id = TokenId::IC {
            ledger_id: Principal::anonymous(),
        };
        let user_id = Principal::anonymous();
        let token_list = UserTokenList {
            version,
            enable_list: vec![token_id.clone()].into_iter().collect(),
        };

        // Act
        user_token_repository
            .update_token_list(user_id, &token_list)
            .unwrap();
        let list = user_token_repository.list_tokens(&user_id).unwrap();

        // Assert
        assert_eq!(list.version, version);
        assert_eq!(list.enable_list.len(), 1);
        assert!(list.enable_list.contains(&token_id));
    }
}
