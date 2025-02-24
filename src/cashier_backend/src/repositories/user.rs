use cashier_types::User;

use super::USER_STORE;

#[cfg_attr(test, faux::create)]
pub struct UserRepository {}

#[cfg_attr(test, faux::methods)]
impl UserRepository {
    pub fn new() -> Self {
        Self {}
    }
    pub fn create(&self, user: User) {
        USER_STORE.with_borrow_mut(|store| {
            let id = user.id.clone();
            store.insert(id, user);
        });
    }

    pub fn get(&self, id: &String) -> Option<User> {
        USER_STORE.with_borrow(|store| store.get(id))
    }
}
