use crate::types::{Candid, UserPreference, UserToken};

use super::{TOKEN_STORE, USER_PREFERENCE_STORE};

pub struct UserPreferenceRepository {}

impl UserPreferenceRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn add(&self, id: String, user_preference: UserPreference) {
        USER_PREFERENCE_STORE.with_borrow_mut(|store| {
            store.insert(id, user_preference);
        });
    }

    pub fn get(&self, id: &String) -> UserPreference {
        USER_PREFERENCE_STORE
            .with_borrow(|store| store.get(id))
            .unwrap_or_default()
    }

    pub fn update(&self, id: String, user_preference: UserPreference) {
        USER_PREFERENCE_STORE.with_borrow_mut(|store| {
            store.insert(id, user_preference);
        });
    }
}
