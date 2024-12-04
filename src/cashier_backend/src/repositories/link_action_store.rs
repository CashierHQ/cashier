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
