use super::{entities::user::User, USER_STORE};

pub fn create(user: User) {
    USER_STORE.with(|store| {
        let pk = user.pk.clone();
        store.borrow_mut().insert(pk, user);
    });
}

pub fn get(pid: String) -> Option<User> {
    let pk = User::build_pk(pid);
    USER_STORE.with(|store| store.borrow().get(&pk.to_string()))
}
