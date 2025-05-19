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

use candid::Principal;

use crate::repositories::user_wallet::UserWalletRepository;

#[cfg_attr(test, faux::create)]
pub struct UserService {
    user_wallet_repository: UserWalletRepository,
}

#[cfg_attr(test, faux::methods)]
impl UserService {
    pub fn get_instance() -> Self {
        Self {
            user_wallet_repository: UserWalletRepository::new(),
        }
    }

    pub fn get_user_id_by_wallet(&self, user_wallet: &Principal) -> Option<String> {
        let user_wallet = self.user_wallet_repository.get(&user_wallet.to_text());

        match user_wallet {
            Some(user_wallet) => Some(user_wallet.user_id),
            None => None,
        }
    }
}
