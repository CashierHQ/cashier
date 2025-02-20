use crate::repositories::ACTION_STORE;
use cashier_types::{Action, ActionKey};

use super::base_repository::Store;

#[cfg_attr(test, faux::create)]
pub struct ActionRepository {}

#[cfg_attr(test, faux::methods)]
impl ActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, action: Action) {
        ACTION_STORE.with_borrow_mut(|store| {
            store.insert(action.id.clone(), action);
        });
    }

    pub fn get(&self, action_id: ActionKey) -> Option<Action> {
        ACTION_STORE.with_borrow(|store| store.get(&action_id).clone())
    }

    pub fn batch_get(&self, ids: Vec<ActionKey>) -> Vec<Action> {
        ACTION_STORE.with_borrow(|store| store.batch_get(ids))
    }

    pub fn update(&self, action: Action) {
        ACTION_STORE.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }
}
