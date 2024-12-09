use super::{entities::user_action::UserAction, USER_ACTION_STORE};

pub fn create(user_action: UserAction) {
    USER_ACTION_STORE.with_borrow_mut(|store| {
        let pk = user_action.pk.clone();
        store.insert(pk, user_action);
    });
}
