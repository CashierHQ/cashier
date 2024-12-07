use crate::utils::logger;

use super::{entities::link::Link, LINK_STORE};

pub fn create(link: Link) {
    LINK_STORE.with(|store| {
        let pk: String = link.pk.clone();
        store.borrow_mut().insert(pk, link);
    });
}

pub fn get(id: &str) -> Option<Link> {
    let pk = Link::build_pk(id.to_string());
    LINK_STORE.with(|store| store.borrow().get(&pk.to_string()))
}

pub fn get_batch(ids: Vec<String>) -> Vec<Link> {
    LINK_STORE.with(|store| {
        let store = store.borrow();
        let mut result = Vec::new();

        for id in ids {
            let pk = Link::build_pk(id);
            let link = store.get(&pk);
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

pub fn update(link: Link) {
    LINK_STORE.with(|store| {
        let pk: String = link.pk.clone();
        logger::info(&format!("update link: {:?}", link));
        store.borrow_mut().insert(pk, link);
    });
}

pub fn delete(id: &str) {
    LINK_STORE.with(|store| {
        store.borrow_mut().remove(&id.to_string());
    });
}
