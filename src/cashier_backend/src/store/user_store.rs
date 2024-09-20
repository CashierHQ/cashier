use crate::types::user::User;

use super::USER_STORE;

pub fn create(id: String, user: User) {
    USER_STORE.with(|store| {
        store.borrow_mut().insert(id, user);
    });
}

pub fn get(id: &str) -> Option<User> {
    USER_STORE.with(|store| store.borrow().get(&id.to_string()))
}

pub fn update(id: String, user: User) {
    USER_STORE.with(|store| {
        store.borrow_mut().insert(id, user);
    });
}

pub fn delete(id: &str) {
    USER_STORE.with(|store| {
        store.borrow_mut().remove(&id.to_string());
    });
}
