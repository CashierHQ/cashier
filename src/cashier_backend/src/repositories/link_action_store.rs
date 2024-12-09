use crate::utils::logger;

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
        store
            .range(start..)
            .take_while(|(key, _)| key.starts_with(prefix))
            .map(|(_, link_action)| {
                crate::types::link_action::LinkAction::from_persistence(link_action.clone())
            })
            .collect()
    })
}

pub fn find_create_action_by_link_id(
    link_id: &str,
) -> Option<crate::types::link_action::LinkAction> {
    let link_action_prefix = format!(
        "link#{}#type#{}#action#",
        link_id,
        crate::types::action::ActionType::Create.to_string()
    );
    let link_action = find_with_prefix(link_action_prefix.as_str());
    link_action.into_iter().next()
}
