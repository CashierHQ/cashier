// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::{
    keys::UserActionKey,
    user_action::v1::{UserAction, UserActionCodec},
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type UserActionRepositoryStorage =
    VersionedBTreeMap<String, UserAction, UserActionCodec, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct UserActionRepository<S: Storage<UserActionRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<UserActionRepositoryStorage>> UserActionRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, user_intent: UserAction) {
        self.storage.with_borrow_mut(|store| {
            let id = UserActionKey {
                user_id: user_intent.user_id,
                action_id: user_intent.action_id.clone(),
            };
            store.insert(id.to_str(), user_intent);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    #[test]
    fn it_should_create_an_user_action() {
        let mut repo = TestRepositories::new().user_action();
        let user_id = random_principal_id();
        let action_id = random_id_string();
        let user_action = UserAction {
            user_id,
            action_id: action_id.clone(),
        };

        // Act
        repo.create(user_action);

        let retrieved_action = repo.storage.with_borrow(|store| {
            store.get(
                &UserActionKey {
                    user_id,
                    action_id: action_id.clone(),
                }
                .to_str(),
            )
        });
        assert!(retrieved_action.is_some());
        assert_eq!(retrieved_action.unwrap().user_id, user_id);
    }
}
