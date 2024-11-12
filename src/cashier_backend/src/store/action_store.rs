use crate::types::action::Action;

use super::ACTION_STORE;

pub fn create(id: String, action: Action) -> Action {
    let action = ACTION_STORE.with(|store| {
        store.borrow_mut().insert(id, action.clone());
        return action;
    });

    action
}

pub fn get(id: &str) -> Option<Action> {
    ACTION_STORE.with(|store| store.borrow().get(&id.to_string()))
}

pub fn get_batch(ids: Vec<String>) -> Vec<Action> {
    ACTION_STORE.with(|store| {
        let store = store.borrow();
        let mut result = Vec::new();

        for id in ids {
            let action = store.get(&id);
            match action {
                Some(action) => {
                    result.push(action);
                }
                None => {
                    continue;
                }
            }
        }

        result
    })
}

pub fn update(id: String, action: Action) {
    ACTION_STORE.with(|store| {
        store.borrow_mut().insert(id, action);
    });
}
