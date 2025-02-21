use cashier_types::{Link, LinkKey};

use super::{base_repository::Store, LINK_STORE};

pub fn create(link: Link) {
    LINK_STORE.with_borrow_mut(|store| {
        let id: LinkKey = link.id.clone();
        store.insert(id, link);
    });
}

pub fn batch_create(links: Vec<Link>) {
    LINK_STORE.with_borrow_mut(|store| {
        for link in links {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        }
    });
}

pub fn get(id: &LinkKey) -> Option<Link> {
    LINK_STORE.with_borrow(|store| store.get(&id))
}

pub fn get_batch(ids: Vec<LinkKey>) -> Vec<Link> {
    LINK_STORE.with_borrow(|store| store.batch_get(ids))
}

pub fn update(link: Link) {
    LINK_STORE.with_borrow_mut(|store| {
        let id: LinkKey = link.id.clone();
        store.insert(id, link);
    });
}
