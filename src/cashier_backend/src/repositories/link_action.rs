use cashier_types::{LinkAction, LinkActionKey};

use super::LINK_ACTION_STORE;

pub fn create(link_action: LinkAction) {
    LINK_ACTION_STORE.with_borrow_mut(|store| {
        let id: LinkActionKey = (
            link_action.link_id.clone(),
            link_action.action_type.clone(),
            link_action.action_id.clone(),
        );
        store.insert(id, link_action);
    });
}

pub fn get(id: &LinkActionKey) -> Option<LinkAction> {
    LINK_ACTION_STORE.with_borrow(|store| store.get(id))
}
