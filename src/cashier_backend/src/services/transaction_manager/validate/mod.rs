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

use crate::repositories::{action, user_wallet};

#[cfg_attr(test, faux::create)]
pub struct ValidateService {
    user_wallet_repository: user_wallet::UserWalletRepository,
    action_repository: action::ActionRepository,
}

#[cfg_attr(test, faux::methods)]
impl ValidateService {
    pub fn get_instance() -> Self {
        ValidateService::new(
            user_wallet::UserWalletRepository::new(),
            action::ActionRepository::new(),
        )
    }
    pub fn new(
        user_wallet_repository: user_wallet::UserWalletRepository,
        action_repository: action::ActionRepository,
    ) -> Self {
        Self {
            user_wallet_repository,
            action_repository,
        }
    }

    pub fn is_action_creator(&self, caller: String, action_id: String) -> Result<bool, String> {
        let user_wallet = match self.user_wallet_repository.get(&caller) {
            Some(user_id) => user_id,
            None => {
                return Err("User not found".to_string());
            }
        };
        let action = self.action_repository.get(action_id);
        match action {
            Some(action) => Ok(action.creator == user_wallet.user_id),
            None => {
                return Err("Action not found".to_string());
            }
        }
    }
}
