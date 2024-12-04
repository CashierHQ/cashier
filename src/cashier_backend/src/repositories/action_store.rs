use super::{entities::action::Action, ACTION_STORE};

pub fn create(action: Action) -> Action {
    let pk = action.pk.clone();
    ACTION_STORE.with(|store| {
        store.borrow_mut().insert(pk, action.clone());
    });

    action
}

pub fn get(id: &str) -> Option<crate::types::action::Action> {
    ACTION_STORE.with(|store| {
        let action = store.borrow().get(&id.to_string());
        match action {
            Some(action) => Some(crate::types::action::Action::from_persistence(
                action.clone(),
            )),
            None => None,
        }
    })
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
