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

use cashier_types::{versioned::VersionedUser, User};

use super::VERSIONED_USER_STORE;

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct UserRepository {}

#[cfg_attr(test, faux::methods)]
impl UserRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, user: User) {
        VERSIONED_USER_STORE.with_borrow_mut(|store| {
            let id = user.id.clone();
            let versioned_user = VersionedUser::build(CURRENT_DATA_VERSION, user)
                .expect("Failed to create versioned user");
            store.insert(id, versioned_user);
        });
    }

    pub fn get(&self, id: &String) -> Option<User> {
        VERSIONED_USER_STORE.with_borrow(|store| {
            store
                .get(id)
                .map(|versioned_user| versioned_user.into_user())
        })
    }
}
