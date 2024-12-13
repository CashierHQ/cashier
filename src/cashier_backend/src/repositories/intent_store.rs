use super::{entities::intent::Intent, INTENT_STORE};

pub fn create(intent: Intent) -> Intent {
    let pk = intent.pk.clone();
    INTENT_STORE.with(|store| {
        store.borrow_mut().insert(pk, intent.clone());
    });

    intent
}

pub fn get(id: &str) -> Option<crate::types::intent::Intent> {
    INTENT_STORE.with(|store| {
        let pk = Intent::build_pk(id.to_string());
        let intent = store.borrow().get(&pk.to_string());
        match intent {
            Some(intent) => Some(crate::types::intent::Intent::from_persistence(
                intent.clone(),
            )),
            None => None,
        }
    })
}

pub fn get_batch(ids: Vec<String>) -> Vec<Intent> {
    INTENT_STORE.with(|store| {
        let store = store.borrow();
        let mut result = Vec::new();

        for id in ids {
            let intent = store.get(&id);
            match intent {
                Some(intent) => {
                    result.push(intent);
                }
                None => {
                    continue;
                }
            }
        }

        result
    })
}

pub fn update(id: String, intent: Intent) {
    INTENT_STORE.with(|store| {
        store.borrow_mut().insert(id, intent);
    });
}
