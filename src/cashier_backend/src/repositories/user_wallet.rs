// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use super::VERSIONED_USER_WALLET_STORE;
use cashier_types::{versioned::VersionedUserWallet, UserWallet, UserWalletKey};

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
