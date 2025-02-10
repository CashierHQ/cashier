use cashier_types::{UserAction, UserActionKey};

use super::USER_ACTION_STORE;

pub fn create(user_intent: UserAction) {
    USER_ACTION_STORE.with_borrow_mut(|store| {
        let id = UserActionKey {
            user_id: user_intent.user_id.clone(),
            action_id: user_intent.action_id.clone(),
        };
        store.insert(id.to_str(), user_intent);
    });
}
