// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::link_reservation::{LinkReservation, LinkReservationCodec};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

/// Per-link list of in-flight reservations, keyed by `link_id`.
pub type LinkReservationRepositoryStorage = VersionedBTreeMap<
    String,
    Vec<LinkReservation>,
    LinkReservationCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;

pub struct LinkReservationRepository<S: Storage<LinkReservationRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<LinkReservationRepositoryStorage>> LinkReservationRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Returns the current reservations for a link (empty vec if none).
    pub fn get(&self, link_id: &str) -> Vec<LinkReservation> {
        self.storage
            .with_borrow(|store| store.get(&link_id.to_string()))
            .unwrap_or_default()
    }

    /// Replaces the reservations for a link.
    ///
    /// Callers must call [`remove`](Self::remove) (not `put(vec![])`) when the list becomes
    /// empty — storing an empty vec leaves a stale key in the map.
    pub fn put(&mut self, link_id: &str, reservations: Vec<LinkReservation>) {
        self.storage.with_borrow_mut(|store| {
            store.insert(link_id.to_string(), reservations);
        });
    }

    /// Removes all reservations for a link (used when the list becomes empty).
    pub fn remove(&mut self, link_id: &str) {
        self.storage.with_borrow_mut(|store| {
            store.remove(&link_id.to_string());
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_backend_types::repository::action::v1::ActionType;
    use cashier_common::test_utils::random_id_string;

    fn reservation(id: &str, ts: u64) -> LinkReservation {
        LinkReservation::new(id.to_string(), ActionType::Receive, ts)
    }

    #[test]
    fn it_should_return_empty_when_no_reservations() {
        let repo = TestRepositories::new().link_reservation();
        assert!(repo.get(&random_id_string()).is_empty());
    }

    #[test]
    fn it_should_put_and_get_reservations() {
        // Arrange
        let mut repo = TestRepositories::new().link_reservation();
        let link_id = random_id_string();
        let reservations = vec![reservation("action-1", 100), reservation("action-2", 200)];

        // Act
        repo.put(&link_id, reservations.clone());

        // Assert
        let retrieved = repo.get(&link_id);
        assert_eq!(retrieved.len(), 2);
        assert_eq!(retrieved[0].id, "action-1");
        assert_eq!(retrieved[0].action_type, ActionType::Receive);
        assert_eq!(retrieved[1].timestamp, 200);
    }

    #[test]
    fn it_should_overwrite_reservations_on_put() {
        // Arrange
        let mut repo = TestRepositories::new().link_reservation();
        let link_id = random_id_string();
        repo.put(&link_id, vec![reservation("action-1", 100)]);

        // Act
        repo.put(&link_id, vec![reservation("action-2", 200)]);

        // Assert
        let retrieved = repo.get(&link_id);
        assert_eq!(retrieved.len(), 1);
        assert_eq!(retrieved[0].id, "action-2");
    }

    #[test]
    fn it_should_remove_reservations() {
        // Arrange
        let mut repo = TestRepositories::new().link_reservation();
        let link_id = random_id_string();
        repo.put(&link_id, vec![reservation("action-1", 100)]);

        // Act
        repo.remove(&link_id);

        // Assert
        assert!(repo.get(&link_id).is_empty());
    }
}
