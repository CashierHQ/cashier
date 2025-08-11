// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::repository::user::v1::User;

use super::USER_STORE;

#[derive(Clone)]

pub struct UserRepository {}

impl Default for UserRepository {
    fn default() -> Self {
        Self::new()
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create() {
        let repo = UserRepository::new();
        let user = User {
            id: "user1".to_string(),
            email: Some("foo@bar.com".to_string()),
        };

        repo.create(user.clone());
        let retrieved_user = repo.get(&user.id);
        assert!(retrieved_user.is_some());
        assert_eq!(retrieved_user.unwrap().id, user.id);
    }

    #[test]
    fn get() {
        let repo = UserRepository::new();
        let user = User {
            id: "user1".to_string(),
            email: Some("foo@bar.com".to_string()),
        };

        repo.create(user.clone());
        let retrieved_user = repo.get(&user.id);
        assert!(retrieved_user.is_some());
        assert_eq!(retrieved_user.unwrap().id, user.id);
    }

    #[test]
    fn default() {
        let repo = UserRepository::default();
        let user = User {
            id: "user1".to_string(),
            email: Some("foo@bar.com".to_string()),
        };

        repo.create(user.clone());
        let retrieved_user = repo.get(&user.id);
        assert!(retrieved_user.is_some());
        assert_eq!(retrieved_user.unwrap().id, user.id);
    }
}
