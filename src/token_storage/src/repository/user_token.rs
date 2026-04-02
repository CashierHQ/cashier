// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use std::{cell::RefCell, thread::LocalKey};

use token_storage_types::{
    TokenId,
    error::CanisterError,
    user::{UserTokenList, UserTokenListCodec},
};

/// Store for UserTokenRepository
pub type UserTokenRepositoryStorage = VersionedBTreeMap<
    Principal,
    UserTokenList,
    UserTokenListCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
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

    /// Add token to enable list
    /// # Arguments
    /// * `user_id` - The ID of the user
    /// * `token_id` - The ID of the token to add
    /// # Returns
    /// * `Ok(())` - If the token was successfully added
    /// * `Err(CanisterError)` - An error message if the token could not be added
    pub fn add_token(
        &mut self,
        user_id: Principal,
        token_id: TokenId,
    ) -> Result<(), CanisterError> {
        self.token_store.with_borrow_mut(|store| {
            let mut user_token_list = store.get(&user_id).ok_or_else(|| {
                CanisterError::HandleLogicError("user token list is not init".to_string())
            })?;

            user_token_list.enable_list.insert(token_id);
            store.insert(user_id, user_token_list.clone());
            Ok(())
        })
    }

    /// Add multiple tokens to the enable list
    /// # Arguments
    /// * `user_id` - The ID of the user
    /// * `token_ids` - The IDs of the tokens to add
    /// # Returns
    /// * `Ok(())` - If the tokens were successfully added
    /// * `Err(CanisterError)` - An error message if the tokens could not
    pub fn add_bulk_tokens(
        &mut self,
        user_id: Principal,
        token_ids: &[TokenId],
    ) -> Result<(), CanisterError> {
        self.token_store.with_borrow_mut(|store| {
            let mut user_token_list = store.get(&user_id).ok_or_else(|| {
                CanisterError::HandleLogicError("user token list is not init".to_string())
            })?;

            token_ids
                .iter()
                .all(|token_id| user_token_list.enable_list.insert(token_id.clone()));

            store.insert(user_id, user_token_list.clone());

            Ok(())
        })
    }

    /// List all tokens in the user's enable list
    /// # Arguments
    /// * `user_id` - The ID of the user
    /// # Returns
    /// * `Ok(UserTokenList)` - The user's token list
    /// * `Err(CanisterError)` - An error message if the user's token list is not initialized
    pub fn list_tokens(&self, user_id: &Principal) -> Result<UserTokenList, CanisterError> {
        self.token_store.with_borrow(|store| {
            store.get(user_id).ok_or_else(|| {
                CanisterError::HandleLogicError("user token list is not init 1".to_string())
            })
        })
    }

    /// Update the user's token list
    /// # Arguments
    /// * `user_id` - The ID of the user
    /// * `token_id` - The ID of the token to update
    /// * `is_enable` - Whether to enable or disable the token
    /// # Returns
    /// * `Ok(())` - If the token was successfully updated
    /// * `Err(CanisterError)` - An error message if the user's token list is not initialized
    pub fn update_token(
        &mut self,
        user_id: Principal,
        token_id: TokenId,
        is_enable: bool,
    ) -> Result<(), CanisterError> {
        self.token_store.with_borrow_mut(|store| {
            let mut user_token_list = store.get(&user_id).ok_or_else(|| {
                CanisterError::HandleLogicError("user token list is not init".to_string())
            })?;

            if is_enable {
                user_token_list.enable_list.insert(token_id);
            } else {
                user_token_list.enable_list.remove(&token_id);
            }

            store.insert(user_id, user_token_list.clone());

            Ok(())
        })
    }

    /// Update the user's token list in batch
    /// # Arguments
    /// * `user_id` - The ID of the user
    /// * `token_list` - The new token list to set for the user
    /// # Returns
    /// * `Ok(())` - If the token list was successfully updated
    /// * `Err(CanisterError)` - An error message if the user's token list
    pub fn update_token_list(
        &mut self,
        user_id: Principal,
        token_list: &UserTokenList,
    ) -> Result<(), CanisterError> {
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

    fn fixture_of_token_id(ledger_id: Principal) -> TokenId {
        TokenId::IC { ledger_id }
    }

    fn fixture_of_user_token_list(token_ids: Vec<TokenId>) -> UserTokenList {
        UserTokenList {
            version: 1,
            enable_list: token_ids.into_iter().collect(),
        }
    }

    #[test]
    fn it_should_fail_add_token_due_to_user_token_list_not_initialized() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let token_id = fixture_of_token_id(Principal::management_canister());

        // Act
        let result = user_token_repository.add_token(user_id, token_id);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("user token list is not init")
        );
    }

    #[test]
    fn it_should_fail_add_bulk_tokens_due_to_user_token_list_not_initialized() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let token_ids = vec![
            fixture_of_token_id(Principal::management_canister()),
            fixture_of_token_id(Principal::anonymous()),
        ];

        // Act
        let result = user_token_repository.add_bulk_tokens(user_id, &token_ids);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("user token list is not init")
        );
    }

    #[test]
    fn it_should_fail_list_tokens_due_to_user_token_list_not_initialized() {
        // Arrange
        let repo = TestRepositories::new();
        let user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();

        // Act
        let result = user_token_repository.list_tokens(&user_id);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("user token list is not init")
        );
    }

    #[test]
    fn it_should_fail_update_token_due_to_user_token_list_not_initialized() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let token_id = fixture_of_token_id(Principal::management_canister());

        // Act
        let result = user_token_repository.update_token(user_id, token_id, true);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("user token list is not init")
        );
    }

    #[test]
    fn it_should_do_update_the_token_list() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let token_id = fixture_of_token_id(Principal::anonymous());
        let user_id = Principal::anonymous();
        let token_list = fixture_of_user_token_list(vec![token_id.clone()]);

        // Act
        let result = user_token_repository.update_token_list(user_id, &token_list);
        let list = user_token_repository.list_tokens(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(list.version, 1);
        assert_eq!(list.enable_list.len(), 1);
        assert!(list.enable_list.contains(&token_id));
    }

    #[test]
    fn it_should_do_add_token() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let existing_token_id = fixture_of_token_id(Principal::anonymous());
        let new_token_id = fixture_of_token_id(Principal::management_canister());
        let token_list = fixture_of_user_token_list(vec![existing_token_id.clone()]);
        user_token_repository
            .update_token_list(user_id, &token_list)
            .unwrap();

        // Act
        let result = user_token_repository.add_token(user_id, new_token_id.clone());
        let list = user_token_repository.list_tokens(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(list.enable_list.len(), 2);
        assert!(list.enable_list.contains(&existing_token_id));
        assert!(list.enable_list.contains(&new_token_id));
    }

    #[test]
    fn it_should_do_add_bulk_tokens() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let existing_token_id = fixture_of_token_id(Principal::anonymous());
        let new_token_id_1 = fixture_of_token_id(Principal::management_canister());
        let new_token_id_2 =
            fixture_of_token_id(Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap());
        let token_list = fixture_of_user_token_list(vec![existing_token_id.clone()]);
        user_token_repository
            .update_token_list(user_id, &token_list)
            .unwrap();

        // Act
        let result = user_token_repository
            .add_bulk_tokens(user_id, &[new_token_id_1.clone(), new_token_id_2.clone()]);
        let list = user_token_repository.list_tokens(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(list.enable_list.len(), 3);
        assert!(list.enable_list.contains(&existing_token_id));
        assert!(list.enable_list.contains(&new_token_id_1));
        assert!(list.enable_list.contains(&new_token_id_2));
    }

    #[test]
    fn it_should_do_list_tokens() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let token_id_1 = fixture_of_token_id(Principal::anonymous());
        let token_id_2 = fixture_of_token_id(Principal::management_canister());
        let token_list = fixture_of_user_token_list(vec![token_id_1.clone(), token_id_2.clone()]);
        user_token_repository
            .update_token_list(user_id, &token_list)
            .unwrap();

        // Act
        let result = user_token_repository.list_tokens(&user_id);

        // Assert
        assert!(result.is_ok());
        let list = result.unwrap();
        assert_eq!(list.version, 1);
        assert_eq!(list.enable_list.len(), 2);
        assert!(list.enable_list.contains(&token_id_1));
        assert!(list.enable_list.contains(&token_id_2));
    }

    #[test]
    fn it_should_do_enable_token_in_update_token() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let existing_token_id = fixture_of_token_id(Principal::anonymous());
        let token_id_to_enable = fixture_of_token_id(Principal::management_canister());
        let token_list = fixture_of_user_token_list(vec![existing_token_id.clone()]);
        user_token_repository
            .update_token_list(user_id, &token_list)
            .unwrap();

        // Act
        let result = user_token_repository.update_token(user_id, token_id_to_enable.clone(), true);
        let list = user_token_repository.list_tokens(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(list.enable_list.len(), 2);
        assert!(list.enable_list.contains(&existing_token_id));
        assert!(list.enable_list.contains(&token_id_to_enable));
    }

    #[test]
    fn it_should_do_disable_token_in_update_token() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let token_id_to_keep = fixture_of_token_id(Principal::anonymous());
        let token_id_to_disable = fixture_of_token_id(Principal::management_canister());
        let token_list =
            fixture_of_user_token_list(vec![token_id_to_keep.clone(), token_id_to_disable.clone()]);
        user_token_repository
            .update_token_list(user_id, &token_list)
            .unwrap();

        // Act
        let result =
            user_token_repository.update_token(user_id, token_id_to_disable.clone(), false);
        let list = user_token_repository.list_tokens(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(list.enable_list.len(), 1);
        assert!(list.enable_list.contains(&token_id_to_keep));
        assert!(!list.enable_list.contains(&token_id_to_disable));
    }

    #[test]
    fn it_should_do_keep_unique_tokens_in_add_bulk_tokens() {
        // Arrange
        let repo = TestRepositories::new();
        let mut user_token_repository = repo.user_token();
        let user_id = Principal::anonymous();
        let existing_token_id = fixture_of_token_id(Principal::anonymous());
        let token_list = fixture_of_user_token_list(vec![existing_token_id.clone()]);
        user_token_repository
            .update_token_list(user_id, &token_list)
            .unwrap();

        // Act
        let result = user_token_repository.add_bulk_tokens(
            user_id,
            &[existing_token_id.clone(), existing_token_id.clone()],
        );
        let list = user_token_repository.list_tokens(&user_id).unwrap();

        // Assert
        assert!(result.is_ok());
        assert_eq!(list.enable_list.len(), 1);
        assert!(list.enable_list.contains(&existing_token_id));
    }
}
