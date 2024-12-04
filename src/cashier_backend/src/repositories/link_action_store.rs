use super::{entities::link_action::LinkAction, LINK_ACTION_STORE};

pub fn create(link_action: LinkAction) -> LinkAction {
    LINK_ACTION_STORE.with(|store| {
        let pk = link_action.pk.clone();
        store.borrow_mut().insert(pk, link_action.clone());
    });

    link_action
}

pub fn get(pk: &str) -> Option<LinkAction> {
    LINK_ACTION_STORE.with(|store| store.borrow().get(&pk.to_string()))
}

pub fn find_with_prefix(prefix: &str) -> Vec<crate::types::link_action::LinkAction> {
    LINK_ACTION_STORE.with(|store| {
        let store = store.borrow();
        let start = prefix.to_string();
        let end = format!("{}{}", prefix, char::MAX);
        store
            .range(start..end)
            .take_while(|(key, _)| key.starts_with(prefix))
            .map(|(_, link_action)| {
                crate::types::link_action::LinkAction::from_persistence(link_action.clone())
            })
            .collect()
    })
}
