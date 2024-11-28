use super::{entities::link::Link, LINK_STORE};

pub fn create(link: Link) {
    LINK_STORE.with(
        |store: &std::cell::RefCell<
            ic_stable_structures::BTreeMap<
                String,
                Link,
                ic_stable_structures::memory_manager::VirtualMemory<
                    std::rc::Rc<std::cell::RefCell<Vec<u8>>>,
                >,
            >,
        >| {
            let pk: String = link.pk.clone();
            store.borrow_mut().insert(pk, link);
        },
    );
}

pub fn get(id: &str) -> Option<Link> {
    LINK_STORE.with(|store| store.borrow().get(&id.to_string()))
}

pub fn get_batch(ids: Vec<String>) -> Vec<Link> {
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

pub fn update(link: Link) {
    LINK_STORE.with(|store| {
        let pk: String = link.pk.clone();
        store.borrow_mut().insert(pk, link);
    });
}

pub fn delete(id: &str) {
    LINK_STORE.with(|store| {
        store.borrow_mut().remove(&id.to_string());
    });
}
