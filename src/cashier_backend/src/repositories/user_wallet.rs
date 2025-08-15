// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{keys::UserWalletKey, user_wallet::v1::UserWallet};
use ic_mple_log::service::Storage;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, memory_manager::VirtualMemory};

pub type UserWalletRepositoryStorage =
    StableBTreeMap<UserWalletKey, UserWallet, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct UserWalletRepository<S: Storage<UserWalletRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<UserWalletRepositoryStorage>> UserWalletRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, wallet: UserWalletKey, user: UserWallet) {
        self.storage.with_borrow_mut(|store| {
            store.insert(wallet, user);
        });
    }

    pub fn get(&self, wallet: &str) -> Option<UserWallet> {
        self.storage
            .with_borrow(|store| store.get(&wallet.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        repositories::{Repositories, tests::TestRepositories},
        utils::test_utils::*,
    };

    #[test]
    fn it_should_create_an_user_wallet() {
        // Arrange
        let mut repo = TestRepositories::new().user_wallet();
        let key_id = random_id_string();
        let user_id = random_principal_id();

        let wallet_key = UserWalletKey::from(key_id);
        let user_wallet = UserWallet {
            user_id: user_id.clone(),
        };

        // Act
        repo.create(wallet_key.clone(), user_wallet);

        // Assert
        let retrieved_wallet = repo.get(&wallet_key);
        assert!(retrieved_wallet.is_some());
        assert_eq!(retrieved_wallet.unwrap().user_id, user_id);
    }

    #[test]
    fn it_should_get_a_user_wallet() {
        // Arrange
        let mut repo = TestRepositories::new().user_wallet();
        let key_id = random_id_string();
        let user_id = random_principal_id();

        let wallet_key = UserWalletKey::from(key_id);
        let user_wallet = UserWallet {
            user_id: user_id.clone(),
        };
        repo.create(wallet_key.clone(), user_wallet);

        // Act
        let retrieved_wallet = repo.get(&wallet_key);

        // Assert
        assert!(retrieved_wallet.is_some());
        assert_eq!(retrieved_wallet.unwrap().user_id, user_id);
    }
}
