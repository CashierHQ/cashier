use crate::utils::gate::generate_gate_id;
use candid::Principal;
use gate_service_types::{Gate, GateStatus, GateUser, GateUserStatus, GateV2, NewGate, NewGateV2};
use ic_mple_log::service::Storage;
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

pub type GateStorage = StableBTreeMap<String, Gate, VirtualMemory<DefaultMemoryImpl>>;
pub type SubjectGateStorage = StableBTreeMap<String, String, VirtualMemory<DefaultMemoryImpl>>;
pub type GateUserStatusStorage =
    StableBTreeMap<GateUser, GateUserStatus, VirtualMemory<DefaultMemoryImpl>>;

pub struct GateRepository<
    G: Storage<GateStorage>,
    S: Storage<SubjectGateStorage>,
    U: Storage<GateUserStatusStorage>,
> {
    gate_map: G,
    subject_gate_map: S,
    gate_user_map: U,
}

impl<G: Storage<GateStorage>, S: Storage<SubjectGateStorage>, U: Storage<GateUserStatusStorage>>
    GateRepository<G, S, U>
{
    pub fn new(gate_map: G, subject_gate_map: S, gate_user_map: U) -> Self {
        Self {
            gate_map,
            subject_gate_map,
            gate_user_map,
        }
    }

    /// Creates a new gate in the repository.
    /// # Arguments
    /// * `new_gate`: The details of the new gate to be created.
    /// # Returns
    /// * `Ok(Gate)`: If the gate is created successfully.
    /// * `Err(String)`: If there is an error during gate creation.
    pub fn create_gate(&mut self, new_gate: NewGate) -> Result<Gate, String> {
        let gate_id = uuid::Uuid::new_v4().to_string();

        let gate = Gate {
            id: gate_id.clone(),
            subject_id: new_gate.subject_id.clone(),
            gate_type: new_gate.gate_type.clone(),
            key: new_gate.key.clone(),
        };

        self.gate_map
            .with_borrow_mut(|map| map.insert(gate_id.clone(), gate.clone()));

        self.subject_gate_map
            .with_borrow_mut(|map| map.insert(new_gate.subject_id.clone(), gate_id));

        Ok(gate)
    }

    pub fn create_gate_v2(&mut self, new_gate: NewGateV2) -> Result<Gate, String> {
        let gate_id = uuid::Uuid::new_v4().to_string();

        let gate = GateV2 {
            id: gate_id.clone(),
            subject_id: new_gate.subject_id.clone(),
            key: new_gate.key.clone(),
        };

        self.gate_map
            .with_borrow_mut(|map| map.insert(gate_id.clone(), gate.clone()));

        Ok(gate)
    }

    /// Retrieves a gate from the repository.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If the gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate(&self, gate_id: &str) -> Option<Gate> {
        self.gate_map
            .with_borrow(|map| map.get(&gate_id.to_string()))
    }

    /// Retrieves a gate by its subject's ID.
    /// # Arguments
    /// * `subject_id`: The ID of the subject whose gate is to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If a gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_by_subject(&self, subject_id: &str) -> Option<Gate> {
        self.subject_gate_map
            .with_borrow(|map| map.get(&subject_id.to_string()))
            .and_then(|gate_id| self.get_gate(&gate_id))
    }

    /// Retrieves the user status of a gate for a specific user.
    /// The user status of a gate indicates whether user has opened it or not.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be checked.
    /// * `user`: The user for whom the gate status is to be checked.
    /// # Returns
    /// * `Ok(Some(GateUserStatus))`: If the gate user status is found.
    /// * `Ok(None)`: If no gate user status is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_user_status(&self, gate_id: &str, user: Principal) -> Option<GateUserStatus> {
        self.gate_user_map.with_borrow(|map| {
            map.get(&GateUser {
                gate_id: gate_id.to_string(),
                user_id: user,
            })
        })
    }

    /// Opens a gate for a specific user.
    /// # Arguments
    /// * `gate`: The gate to be opened.
    /// * `user`: The user who is opening the gate.
    /// # Returns
    /// * `Ok((Gate, GateUserStatus))`: If the gate is opened successfully.
    /// * `Err(String)`: If there is an error during gate opening.
    pub fn open_gate(
        &mut self,
        gate: Gate,
        user: Principal,
    ) -> Result<(Gate, GateUserStatus), String> {
        self.gate_user_map.with_borrow_mut(|map| {
            let gate_user = GateUser {
                gate_id: gate.id.clone(),
                user_id: user,
            };
            let gate_user_status = GateUserStatus {
                gate_id: gate.id.clone(),
                user_id: user,
                status: GateStatus::Open,
            };
            map.insert(gate_user, gate_user_status.clone());
            Ok((gate, gate_user_status))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use gate_service_types::{GateKey, GateType};

    #[test]
    fn it_should_success_create_password_gate() {
        // Arrange
        let mut repo = TestRepositories::new().gate();

        let gates = vec![
            NewGate {
                subject_id: "subject1".to_string(),
                gate_type: GateType::Password,
                key: GateKey::Password("password123".to_string()),
            },
            NewGate {
                subject_id: "subject2".to_string(),
                gate_type: GateType::XFollowing,
                key: GateKey::XFollowing("x_handle".to_string()),
            },
            NewGate {
                subject_id: "subject3".to_string(),
                gate_type: GateType::TelegramGroup,
                key: GateKey::TelegramGroup("telegram_group_id".to_string()),
            },
            NewGate {
                subject_id: "subject4".to_string(),
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
        let repo = TestRepositories::new().gate();

        // Act
        let gate = repo.get_gate("non_existent_id");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_gate_by_id() {
        // Arrange
        let mut repo = TestRepositories::new().gate();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
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
        let repo = TestRepositories::new().gate();

        // Act
        let gate = repo.get_gate_by_subject("non_existent_subject");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_gate_by_subject_id() {
        // Arrange
        let mut repo = TestRepositories::new().gate();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        let gate = repo.create_gate(new_gate.clone()).unwrap();

        // Act
        let gate = repo.get_gate_by_subject(&gate.subject_id);

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
        let repo = TestRepositories::new().gate();
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
        let mut repo = TestRepositories::new().gate();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
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
