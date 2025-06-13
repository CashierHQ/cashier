// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use cashier_types::User;
use cashier_types::VersionedUser;

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
