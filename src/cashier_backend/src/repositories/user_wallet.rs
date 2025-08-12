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
