use cashier_types::{keys::ActionTypeKey, LinkAction, LinkActionKey, LinkKey};

use super::LINK_ACTION_STORE;

pub fn create(link_action: LinkAction) {
    LINK_ACTION_STORE.with_borrow_mut(|store| {
        let id: LinkActionKey = LinkActionKey {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
        };
        store.insert(id.to_str(), link_action);
    });
}

pub fn get(id: LinkActionKey) -> Option<LinkAction> {
    LINK_ACTION_STORE.with_borrow(|store| store.get(&id.to_str()))
}

pub fn get_by_link_action(link_id: LinkKey, action_type: ActionTypeKey) -> Vec<LinkAction> {
    LINK_ACTION_STORE.with_borrow(|store| {
        let key: LinkActionKey = LinkActionKey {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            action_id: "".to_string(),
        };

        let prefix = key.to_str().clone();

        let actions: Vec<_> = store
            .range(prefix.clone()..)
            .filter(|(key, _)| key.starts_with(&prefix))
            .map(|(_, value)| value.clone())
            .collect();

        actions
    })
}
