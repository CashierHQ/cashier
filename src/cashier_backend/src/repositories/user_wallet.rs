// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::USER_WALLET_STORE;
use cashier_types::repository::{keys::UserWalletKey, user_wallet::v1::UserWallet};

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
#[allow(clippy::unwrap_used)]
#[allow(clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn create() {
        let repo = UserWalletRepository::new();
        let wallet_key = UserWalletKey::from("key1");
        let user_wallet = UserWallet {
            user_id: "user1".to_string(),
        };
        repo.create(wallet_key.clone(), user_wallet);

        let retrieved_wallet = repo.get(&wallet_key);
        assert!(retrieved_wallet.is_some());
        assert_eq!(retrieved_wallet.unwrap().user_id, "user1");
    }

    #[test]
    fn get() {
        let repo = UserWalletRepository::new();
        let wallet_key = UserWalletKey::from("key1");
        let user_wallet = UserWallet {
            user_id: "user1".to_string(),
        };
        repo.create(wallet_key.clone(), user_wallet);

        let retrieved_wallet = repo.get(&wallet_key);
        assert!(retrieved_wallet.is_some());
        assert_eq!(retrieved_wallet.unwrap().user_id, "user1");
    }

    #[test]
    fn default() {
        let repo = UserWalletRepository::default();
        let wallet_key = UserWalletKey::from("key1");
        let user_wallet = UserWallet {
            user_id: "user1".to_string(),
        };
        repo.create(wallet_key.clone(), user_wallet);

        let retrieved_wallet = repo.get(&wallet_key);
        assert!(retrieved_wallet.is_some());
        assert_eq!(retrieved_wallet.unwrap().user_id, "user1");
    }
}
