use super::{entities::user_intent::UserIntent, USER_INTENT_STORE};

pub fn create(user_intent: UserIntent) {
    USER_INTENT_STORE.with_borrow_mut(|store| {
        let pk = user_intent.pk.clone();
        store.insert(pk, user_intent);
    });
}
