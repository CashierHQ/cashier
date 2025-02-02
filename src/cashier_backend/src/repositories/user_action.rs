use cashier_types::UserAction;

use super::USER_ACTION_STORE;

pub fn create(user_intent: UserAction) {
    USER_ACTION_STORE.with_borrow_mut(|store| {
        let id = (user_intent.user_id.clone(), user_intent.action_id.clone());
        store.insert(id, user_intent);
    });
}
