use super::USER_ACTION_STORE;
use cashier_types::{UserAction, UserActionKey};

pub struct UserActionRepository {}

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
