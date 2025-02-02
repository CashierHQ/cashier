use cashier_types::{keys::ActionTypeKey, LinkAction, LinkActionKey, LinkKey};

use super::{base_repository::Store, LINK_ACTION_STORE};

pub fn create(link_action: LinkAction) {
    LINK_ACTION_STORE.with_borrow_mut(|store| {
        let id: LinkActionKey = (
            link_action.link_id.clone(),
            link_action.action_type.clone(),
            link_action.action_id.clone(),
        );
        store.insert(id.into(), link_action);
    });
}

pub fn get(id: LinkActionKey) -> Option<LinkAction> {
    LINK_ACTION_STORE.with_borrow(|store| store.get(&id.into()))
}

pub fn get_by_link_action(link_id: LinkKey, action_type: ActionTypeKey) -> Vec<LinkAction> {
    LINK_ACTION_STORE.with_borrow(|store| {
        let key: LinkActionKey = (link_id, action_type, "".to_string());

        store.get_range(key.into(), None)
    })
}
