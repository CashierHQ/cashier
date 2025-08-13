// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::USER_WALLET_STORE;
use cashier_backend_types::repository::{keys::UserWalletKey, user_wallet::v1::UserWallet};

#[derive(Clone)]

pub struct UserWalletRepository {}

impl Default for UserWalletRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl UserWalletRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, wallet: UserWalletKey, user: UserWallet) {
        USER_WALLET_STORE.with_borrow_mut(|store| {
            store.insert(wallet, user);
        });
    }

    pub fn get(&self, wallet: &str) -> Option<UserWallet> {
        USER_WALLET_STORE.with_borrow(|store| store.get(&wallet.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::*;

    #[test]
    fn it_should_create_an_user_wallet() {
        let repo = UserWalletRepository::new();
        let key_id = random_id_string();
        let user_id = random_principal_id();

        let wallet_key = UserWalletKey::from(key_id);
        let user_wallet = UserWallet {
            user_id: user_id.clone(),
        };
        repo.create(wallet_key.clone(), user_wallet);

        let retrieved_wallet = repo.get(&wallet_key);
        assert!(retrieved_wallet.is_some());
        assert_eq!(retrieved_wallet.unwrap().user_id, user_id);
    }

    #[test]
    fn it_should_get_a_user_wallet() {
        let repo = UserWalletRepository::new();
        let key_id = random_id_string();
        let user_id = random_principal_id();

        let wallet_key = UserWalletKey::from(key_id);
        let user_wallet = UserWallet {
            user_id: user_id.clone(),
        };
        repo.create(wallet_key.clone(), user_wallet);

        let retrieved_wallet = repo.get(&wallet_key);
        assert!(retrieved_wallet.is_some());
        assert_eq!(retrieved_wallet.unwrap().user_id, user_id);
    }

    #[test]
    fn it_should_create_a_user_wallet_repository_by_default() {
        let repo = UserWalletRepository::default();
        let key_id = random_id_string();
        let user_id = random_principal_id();
        let wallet_key = UserWalletKey::from(key_id);
        let user_wallet = UserWallet {
            user_id: user_id.clone(),
        };
        repo.create(wallet_key.clone(), user_wallet);

        let retrieved_wallet = repo.get(&wallet_key);
        assert!(retrieved_wallet.is_some());
        assert_eq!(retrieved_wallet.unwrap().user_id, user_id);
    }
}
