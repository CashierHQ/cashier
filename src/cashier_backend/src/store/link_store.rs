use crate::types::link_detail::LinkDetail;

use super::LINK_STORE;

pub fn create(id: String, link: LinkDetail) {
    LINK_STORE.with(|store| {
        store.borrow_mut().insert(id, link);
    });
}

pub fn get(id: &str) -> Option<LinkDetail> {
    LINK_STORE.with(|store| store.borrow().get(&id.to_string()))
}

pub fn get_batch(ids: Vec<String>) -> Vec<LinkDetail> {
    LINK_STORE.with(|store| {
        let store = store.borrow();
        let mut result = Vec::new();

        for id in ids {
            let link = store.get(&id);
            match link {
                Some(link) => {
                    result.push(link);
                }
                None => {
                    continue;
                }
            }
        }

        result
    })
}

pub fn update(id: String, link: LinkDetail) {
    LINK_STORE.with(|store| {
        store.borrow_mut().insert(id, link);
    });
}

pub fn delete(id: &str) {
    LINK_STORE.with(|store| {
        store.borrow_mut().remove(&id.to_string());
    });
}
