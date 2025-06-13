// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use super::VERSIONED_USER_WALLET_STORE;
use cashier_types::{UserWallet, UserWalletKey, VersionedUserWallet};

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct UserWalletRepository {}

#[cfg_attr(test, faux::methods)]
impl UserWalletRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, wallet: UserWalletKey, user: UserWallet) {
        VERSIONED_USER_WALLET_STORE.with_borrow_mut(|store| {
            let versioned_user_wallet = VersionedUserWallet::build(CURRENT_DATA_VERSION, user)
                .expect("Failed to create versioned user wallet");
            store.insert(wallet, versioned_user_wallet);
        });
    }

    pub fn get(&self, wallet: &UserWalletKey) -> Option<UserWallet> {
        VERSIONED_USER_WALLET_STORE.with_borrow(|store| {
            store
                .get(wallet)
                .map(|versioned_user_wallet| versioned_user_wallet.into_user_wallet())
        })
    }
}
