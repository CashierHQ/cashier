// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::repository::link_gate_user_status::{
    LinkGateUserStatus, LinkGateUserStatusCodec, link_gate_user_status_key,
};
use gate_service_types::GateStatus;
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type LinkGateUserStatusRepositoryStorage = VersionedBTreeMap<
    String,
    LinkGateUserStatus,
    LinkGateUserStatusCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;

#[derive(Clone)]
pub struct LinkGateUserStatusRepository<S: Storage<LinkGateUserStatusRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<LinkGateUserStatusRepositoryStorage>> LinkGateUserStatusRepository<S> {
    /// Creates a new `LinkGateUserStatusRepository`.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Returns the cached gate status for the given (link, user, gate) triplet.
    /// # Arguments
    /// * `link_id` - The ID of the link.
    /// * `user_id` - The Principal of the user.
    /// * `gate_id` - The ID of the gate.
    /// # Returns
    /// An `Option<LinkGateUserStatus>` which is `Some` if the status exists and `None` if it does not.
    pub fn get(
        &self,
        link_id: &str,
        user_id: Principal,
        gate_id: &str,
    ) -> Option<LinkGateUserStatus> {
        let key = link_gate_user_status_key(link_id, user_id, gate_id);
        self.storage.with_borrow(|store| store.get(&key))
    }

    /// Persists an Open status for the given (link, user, gate) triplet.
    /// # Arguments
    /// * `link_id` - The ID of the link.
    /// * `user_id` - The Principal of the user.
    /// * `gate_id` - The ID of the gate.
    pub fn set_open(&mut self, link_id: &str, user_id: Principal, gate_id: &str) {
        let key = link_gate_user_status_key(link_id, user_id, gate_id);
        let entry = LinkGateUserStatus {
            link_id: link_id.to_string(),
            user_id,
            gate_id: gate_id.to_string(),
            status: GateStatus::Open,
        };
        self.storage.with_borrow_mut(|store| {
            store.insert(key, entry);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn fixture_of_gate_id() -> String {
        format!("gate_{}", random_id_string())
    }

    #[test]
    fn it_should_fail_get_status_due_to_nonexistent_entry() {
        // Arrange
        let repo = TestRepositories::new().link_gate_user_status();
        let link_id = random_id_string();
        let user_id = random_principal_id();
        let gate_id = fixture_of_gate_id();

        // Act
        let result = repo.get(&link_id, user_id, &gate_id);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_set_open_status_for_user() {
        // Arrange
        let mut repo = TestRepositories::new().link_gate_user_status();
        let link_id = random_id_string();
        let user_id = random_principal_id();
        let gate_id = fixture_of_gate_id();

        // Act
        repo.set_open(&link_id, user_id, &gate_id);

        // Assert
        let result = repo.get(&link_id, user_id, &gate_id);
        assert!(result.is_some());
        let status = result.unwrap();
        assert_eq!(status.status, GateStatus::Open);
        assert_eq!(status.link_id, link_id);
        assert_eq!(status.gate_id, gate_id);
        assert_eq!(status.user_id, user_id);
    }
}
