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

use super::USER_ACTION_STORE;
use cashier_types::{UserAction, UserActionKey};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct UserActionRepository {}

#[cfg_attr(test, faux::methods)]
impl UserActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, user_intent: UserAction) {
        USER_ACTION_STORE.with_borrow_mut(|store| {
            let id = UserActionKey {
                user_id: user_intent.user_id.clone(),
                action_id: user_intent.action_id.clone(),
            };
            store.insert(id.to_str(), user_intent);
        });
    }
}
