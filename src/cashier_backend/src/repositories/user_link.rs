use cashier_types::{UserLink, UserLinkKey};

use super::{base_repository::Store, USER_LINK_STORE};

pub fn create(user_link: UserLink) {
    USER_LINK_STORE.with_borrow_mut(|store| {
        let id: UserLinkKey = (user_link.user_id.clone(), user_link.link_id.clone());
        store.insert(id, user_link);
    });
}

pub fn batch_create(user_links: Vec<UserLink>) {
    USER_LINK_STORE.with_borrow_mut(|store| {
        for user_link in user_links {
            let id: UserLinkKey = (user_link.user_id.clone(), user_link.link_id.clone());
            store.insert(id, user_link);
        }
    });
}

pub fn get(id: &UserLinkKey) -> Option<UserLink> {
    USER_LINK_STORE.with_borrow(|store| store.get(id))
}

pub fn get_link_by_user_id(user_id: String) -> Vec<UserLink> {
    USER_LINK_STORE.with_borrow(|store| {
        let start: UserLinkKey = (user_id.clone(), "".to_string());
        let end: UserLinkKey = (user_id, "\u{10FFFF}".to_string()); // Use a high Unicode character to represent the end of the range
        store.get_range(start, Some(end))
    })
}
