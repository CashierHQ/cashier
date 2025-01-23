use crate::repositories::ACTION_STORE;
use cashier_types::{Action, ActionKey};

pub fn create(action: Action) {
    ACTION_STORE.with_borrow_mut(|store| {
        store.insert(action.id.clone(), action);
    });
}

pub fn get(action_id: &ActionKey) -> Option<Action> {
    ACTION_STORE.with_borrow(|store| store.get(action_id).clone())
}

pub fn update(action: Action) {
    ACTION_STORE.with_borrow_mut(|store| {
        let id = action.id.clone();
        store.insert(id, action);
    });
}
