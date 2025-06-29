// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::user::v1::User;

use super::USER_STORE;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct UserRepository {}

#[cfg_attr(test, faux::methods)]
impl UserRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, user: User) {
        USER_STORE.with_borrow_mut(|store| {
            let id = user.id.clone();
            store.insert(id, user);
        });
    }

    pub fn get(&self, id: &String) -> Option<User> {
        USER_STORE.with_borrow(|store| store.get(id))
    }
}
