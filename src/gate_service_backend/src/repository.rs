use candid::Principal;
use gate_service_types::{Gate, GateStatus, GateUser, GateUserStatus, NewGate};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

pub trait GateRepository {
    /// Creates a new gate in the repository.
    /// # Arguments
    /// * `new_gate`: The details of the new gate to be created.
    /// # Returns
    /// * `Ok(Gate)`: If the gate is created successfully.
    /// * `Err(String)`: If there is an error during gate creation.
    fn create_gate(&self, gate: NewGate) -> Result<Gate, String>;

    /// Retrieves a gate from the repository.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If the gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    fn get_gate(&self, gate_id: &str) -> Option<Gate>;

    /// Retrieves a gate by its owner's ID.
    /// # Arguments
    /// * `subject_id`: The ID of the owner whose gate is to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If a gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    fn get_gate_by_owner(&self, subject_id: &str) -> Option<Gate>;

    /// Retrieves the user status of a gate for a specific user.
    /// The user status of a gate indicates whether user has opened it or not.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be checked.
    /// * `user`: The user for whom the gate status is to be checked.
    /// # Returns
    /// * `Ok(Some(GateUserStatus))`: If the gate user status is found.
    /// * `Ok(None)`: If no gate user status is found.
    /// * `Err(String)`: If there is an error during retrieval.
    fn get_gate_user_status(&self, gate_id: &str, user: Principal) -> Option<GateUserStatus>;

    /// Opens a gate for a specific user.
    /// # Arguments
    /// * `gate`: The gate to be opened.
    /// * `user`: The user who is opening the gate.
    /// # Returns
    /// * `Ok((Gate, GateUserStatus))`: If the gate is opened successfully.
    /// * `Err(String)`: If there is an error during gate opening.
    fn open_gate(&self, gate: Gate, user: Principal) -> Result<(Gate, GateUserStatus), String>;
}

pub struct StableGateRepository {
    gate_map: RefCell<StableBTreeMap<String, Gate, VirtualMemory<DefaultMemoryImpl>>>,
    owner_map: RefCell<StableBTreeMap<String, String, VirtualMemory<DefaultMemoryImpl>>>,
    gate_user_map:
        RefCell<StableBTreeMap<GateUser, GateUserStatus, VirtualMemory<DefaultMemoryImpl>>>,
}

impl StableGateRepository {
    pub fn new(
        gate_memory: VirtualMemory<DefaultMemoryImpl>,
        owner_memory: VirtualMemory<DefaultMemoryImpl>,
        gate_user_memory: VirtualMemory<DefaultMemoryImpl>,
    ) -> Self {
        Self {
            gate_map: RefCell::new(StableBTreeMap::init(gate_memory)),
            owner_map: RefCell::new(StableBTreeMap::init(owner_memory)),
            gate_user_map: RefCell::new(StableBTreeMap::init(gate_user_memory)),
        }
    }
}

impl GateRepository for StableGateRepository {
    fn create_gate(&self, new_gate: NewGate) -> Result<Gate, String> {
        let gate_id = uuid::Uuid::new_v4().to_string();

        let gate = Gate {
            id: gate_id.clone(),
            subject_id: new_gate.subject_id.clone(),
            gate_type: new_gate.gate_type.clone(),
            key: new_gate.key.clone(),
        };

        self.gate_map
            .borrow_mut()
            .insert(gate_id.clone(), gate.clone());

        self.owner_map
            .borrow_mut()
            .insert(new_gate.subject_id.clone(), gate_id);

        Ok(gate)
    }

    fn get_gate(&self, gate_id: &str) -> Option<Gate> {
        self.gate_map.borrow().get(&gate_id.to_string())
    }

    fn get_gate_by_owner(&self, subject_id: &str) -> Option<Gate> {
        if let Some(gate_id) = self.owner_map.borrow().get(&subject_id.to_string()) {
            return self.get_gate(&gate_id);
        }
        None
    }

    fn get_gate_user_status(&self, gate_id: &str, user: Principal) -> Option<GateUserStatus> {
        self.gate_user_map.borrow().get(&GateUser {
            gate_id: gate_id.to_string(),
            user_id: user,
        })
    }

    fn open_gate(&self, gate: Gate, user: Principal) -> Result<(Gate, GateUserStatus), String> {
        let mut gate_user_map = self.gate_user_map.borrow_mut();
        let gate_user = GateUser {
            gate_id: gate.id.clone(),
            user_id: user,
        };
        let gate_user_status = GateUserStatus {
            gate_id: gate.id.clone(),
            user_id: user,
            status: GateStatus::Open,
        };
        gate_user_map.insert(gate_user, gate_user_status.clone());
        Ok((gate, gate_user_status))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::gate_repository_fixture;
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use gate_service_types::{GateKey, GateType};

    #[test]
    fn it_should_success_create_password_gate() {
        // Arrange
        let repo = gate_repository_fixture();

        let gates = vec![
            NewGate {
                subject_id: "owner1".to_string(),
                gate_type: GateType::Password,
                key: GateKey::Password("password123".to_string()),
            },
            NewGate {
                subject_id: "owner2".to_string(),
                gate_type: GateType::XFollowing,
                key: GateKey::XFollowing("x_handle".to_string()),
            },
            NewGate {
                subject_id: "owner3".to_string(),
                gate_type: GateType::TelegramGroup,
                key: GateKey::TelegramGroup("telegram_group_id".to_string()),
            },
            NewGate {
                subject_id: "owner4".to_string(),
                gate_type: GateType::DiscordServer,
                key: GateKey::DiscordServer("discord_server_id".to_string()),
            },
        ];

        for gate in gates {
            // Act
            let created_gate = repo.create_gate(gate.clone()).unwrap();

            // Assert
            assert!(!created_gate.id.is_empty());
            assert_eq!(created_gate.subject_id, gate.subject_id);
            assert_eq!(created_gate.gate_type, gate.gate_type);
            assert_eq!(created_gate.key, gate.key);
        }
    }

    #[test]
    fn it_should_none_get_gate_by_id() {
        // Arrange
        let repo = gate_repository_fixture();

        // Act
        let gate = repo.get_gate("non_existent_id");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_gate_by_id() {
        // Arrange
        let repo = gate_repository_fixture();
        let new_gate = NewGate {
            subject_id: "owner1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        let gate = repo.create_gate(new_gate.clone()).unwrap();

        // Act
        let gate = repo.get_gate(&gate.id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.subject_id, new_gate.subject_id);
        assert_eq!(gate.gate_type, new_gate.gate_type);
        assert_eq!(gate.key, new_gate.key);
    }

    #[test]
    fn it_should_none_get_gate_by_subject_id() {
        // Arrange
        let repo = gate_repository_fixture();

        // Act
        let gate = repo.get_gate_by_owner("non_existent_owner");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_gate_by_subject_id() {
        // Arrange
        let repo = gate_repository_fixture();
        let new_gate = NewGate {
            subject_id: "owner1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        let gate = repo.create_gate(new_gate.clone()).unwrap();

        // Act
        let gate = repo.get_gate_by_owner(&gate.subject_id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.subject_id, new_gate.subject_id);
        assert_eq!(gate.gate_type, new_gate.gate_type);
        assert_eq!(gate.key, new_gate.key);
    }

    #[test]
    fn it_should_none_get_gate_user_status() {
        // Arrange
        let repo = gate_repository_fixture();
        let gate_id = random_id_string();
        let user = random_principal_id();

        // Act
        let status = repo.get_gate_user_status(&gate_id, user);

        // Assert
        assert!(status.is_none());
    }

    #[test]
    fn it_should_open_gate_and_get_gate_user_status() {
        // Arrange
        let repo = gate_repository_fixture();
        let new_gate = NewGate {
            subject_id: "owner1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        let gate = repo.create_gate(new_gate.clone()).unwrap();
        let user = random_principal_id();

        // Act
        let result = repo.open_gate(gate.clone(), user);

        // Assert
        assert!(result.is_ok());
        let (opened_gate, status) = result.unwrap();
        assert_eq!(opened_gate.id, gate.id);
        assert_eq!(status.user_id, user);
        assert_eq!(status.status, GateStatus::Open);

        // Act
        let gate_user_status = repo.get_gate_user_status(&gate.id, user);

        // Assert
        assert!(gate_user_status.is_some());
        let gate_user_status = gate_user_status.unwrap();
        assert_eq!(gate_user_status.gate_id, gate.id);
        assert_eq!(gate_user_status.user_id, user);
        assert_eq!(gate_user_status.status, GateStatus::Open);
    }
}
