use cashier_types::User;

use super::USER_STORE;


pub struct UserRepository {}


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
