use super::{base_repository::Store, LINK_STORE};
use cashier_types::{Link, LinkKey};

pub struct LinkRepository {}

impl LinkRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, link: Link) {
        LINK_STORE.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn batch_create(&self, links: Vec<Link>) {
        LINK_STORE.with_borrow_mut(|store| {
            for link in links {
                let id: LinkKey = link.id.clone();
                store.insert(id, link);
            }
        });
    }

    pub fn get(&self, id: &LinkKey) -> Option<Link> {
        LINK_STORE.with_borrow(|store| store.get(&id))
    }

    pub fn get_batch(&self, ids: Vec<LinkKey>) -> Vec<Link> {
        LINK_STORE.with_borrow(|store| store.batch_get(ids))
    }

    pub fn update(&self, link: Link) {
        LINK_STORE.with_borrow_mut(|store| {
            let id: LinkKey = link.id.clone();
            store.insert(id, link);
        });
    }

    pub fn delete(&self, id: &LinkKey) {
        LINK_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }
}
