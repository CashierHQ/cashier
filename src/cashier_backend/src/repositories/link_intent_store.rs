use super::{entities::link_intent::LinkIntent, LINK_INTENT_STORE};

pub fn create(link_intent: LinkIntent) -> LinkIntent {
    LINK_INTENT_STORE.with(|store| {
        let pk = link_intent.pk.clone();
        store.borrow_mut().insert(pk, link_intent.clone());
    });

    link_intent
}

pub fn get(pk: &str) -> Option<LinkIntent> {
    LINK_INTENT_STORE.with(|store| store.borrow().get(&pk.to_string()))
}

pub fn find_with_prefix(prefix: &str) -> Vec<crate::types::link_intent::LinkIntent> {
    LINK_INTENT_STORE.with(|store| {
        let store = store.borrow();
        let start = prefix.to_string();
        store
            .range(start..)
            .take_while(|(key, _)| key.starts_with(prefix))
            .map(|(_, link_intent)| {
                crate::types::link_intent::LinkIntent::from_persistence(link_intent.clone())
            })
            .collect()
    })
}

pub fn find_create_intent_by_link_id(
    link_id: &str,
) -> Option<crate::types::link_intent::LinkIntent> {
    let link_intent_prefix = format!(
        "link#{}#type#{}#intent#",
        link_id,
        crate::types::intent::IntentType::Create.to_string()
    );
    let link_intent = find_with_prefix(link_intent_prefix.as_str());
    link_intent.into_iter().next()
}
