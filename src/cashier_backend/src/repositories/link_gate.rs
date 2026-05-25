// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::repository::link_gate::{LinkGate, LinkGateCodec};
use gate_service_types::Gate;
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type LinkGateRepositoryStorage =
    VersionedBTreeMap<String, LinkGate, LinkGateCodec, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Clone)]
pub struct LinkGateRepository<S: Storage<LinkGateRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<LinkGateRepositoryStorage>> LinkGateRepository<S> {
    /// Creates a new `LinkGateRepository`.
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    /// Returns the `LinkGate` for the given `link_id`, if it exists.
    pub fn get(&self, link_id: &str) -> Option<LinkGate> {
        self.storage
            .with_borrow(|store| store.get(&link_id.to_string()))
    }

    /// Appends `gate` to the list of gates for `link_id`, creating the entry if absent.
    /// The gate returned by GateService already has the password redacted.
    pub fn add_gate(&mut self, link_id: &str, gate: Gate) {
        self.storage.with_borrow_mut(|store| {
            let mut entry = store.get(&link_id.to_string()).unwrap_or_else(|| LinkGate {
                link_id: link_id.to_string(),
                gates: vec![],
            });
            entry.gates.push(gate);
            store.insert(link_id.to_string(), entry);
        });
    }
}

#[cfg(test)]
mod tests {
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use gate_service_types::{Gate, GateKey};

    fn fixture_of_gate(gate_id: &str, link_id: &str) -> Gate {
        Gate {
            id: gate_id.to_string(),
            creator: random_principal_id(),
            subject_id: link_id.to_string(),
            key: GateKey::PasswordRedacted,
        }
    }

    #[test]
    fn it_should_fail_get_link_gate_due_to_nonexistent_link() {
        // Arrange
        let repo = TestRepositories::new().link_gate();
        let link_id = random_id_string();

        // Act
        let result = repo.get(&link_id);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_add_gate_to_link() {
        // Arrange
        let mut repo = TestRepositories::new().link_gate();
        let link_id = random_id_string();
        let gate_id = format!("gate_{}", random_id_string());
        let gate = fixture_of_gate(&gate_id, &link_id);

        // Act
        repo.add_gate(&link_id, gate);

        // Assert
        let result = repo.get(&link_id);
        assert!(result.is_some());
        let link_gate = result.unwrap();
        assert_eq!(link_gate.link_id, link_id);
        assert_eq!(link_gate.gates.len(), 1);
        assert_eq!(link_gate.gates[0].id, gate_id);
    }

    #[test]
    fn it_should_support_multiple_gates_per_link() {
        // Arrange
        let mut repo = TestRepositories::new().link_gate();
        let link_id = random_id_string();
        let gate_id_1 = format!("gate_{}", random_id_string());
        let gate_id_2 = format!("gate_{}", random_id_string());

        // Act
        repo.add_gate(&link_id, fixture_of_gate(&gate_id_1, &link_id));
        repo.add_gate(&link_id, fixture_of_gate(&gate_id_2, &link_id));

        // Assert
        let result = repo.get(&link_id);
        assert!(result.is_some());
        let link_gate = result.unwrap();
        assert_eq!(link_gate.gates.len(), 2);
        assert!(link_gate.gates.iter().any(|g| g.id == gate_id_1));
        assert!(link_gate.gates.iter().any(|g| g.id == gate_id_2));
    }
}
