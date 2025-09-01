use crate::gates::GateFactory;
use crate::repository::GateRepository;
use crate::utils::hash_password;
use candid::Principal;
use gate_service_types::{Gate, GateKey, GateType, GateUserStatus, GateVerifier, NewGate};
use std::cell::RefCell;
use std::rc::Rc;

pub struct GateService<R: GateRepository> {
    repository: Rc<RefCell<R>>,
    gate_factory: GateFactory,
}

impl<R: GateRepository> GateService<R> {
    pub fn new(repository: Rc<RefCell<R>>) -> Self {
        Self {
            repository,
            gate_factory: GateFactory {},
        }
    }

    /// Create a new gate and associate it with its owner.
    /// # Arguments
    /// * `new_gate`: The details of the new gate to be created.
    /// # Returns
    /// * `Ok(Gate)`: If the gate is created successfully.
    /// * `Err(String)`: If there is an error during gate creation.
    pub fn add_gate(&self, new_gate: NewGate) -> Result<Gate, String> {
        let gate_key = match &new_gate.key {
            GateKey::Password(password) => {
                let hashed_password = hash_password(password)?;
                GateKey::Password(hashed_password)
            }
            _ => new_gate.key.clone(),
        };

        let repository = self.repository.borrow_mut();

        let mut gate = repository.create_gate(NewGate {
            key: gate_key,
            ..new_gate
        })?;

        // redact password
        match gate.gate_type {
            GateType::Password => {
                gate.key = GateKey::Password("".to_string());
                Ok(gate)
            }
            _ => Ok(gate),
        }
    }

    /// Retrieves a gate by its ID
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If the gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate(&self, gate_id: &str) -> Option<Gate> {
        let repository = self.repository.borrow();
        repository.get_gate(gate_id).map(|mut g| match g.gate_type {
            GateType::Password => {
                // redact password from gate info
                g.key = GateKey::Password("".to_string());
                g
            }
            _ => g,
        })
    }

    /// Retrieves a gate by its owner's ID.
    /// # Arguments
    /// * `subject_id`: The ID of the owner whose gate is to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If a gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_by_owner(&self, subject_id: &str) -> Option<Gate> {
        let repository = self.repository.borrow();
        repository
            .get_gate_by_owner(subject_id)
            .map(|mut g| match g.gate_type {
                GateType::Password => {
                    // redact password from gate info
                    g.key = GateKey::Password("".to_string());
                    g
                }
                _ => g,
            })
    }

    /// Retrieves a gate that is currently being opened.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be checked.
    /// # Returns
    /// * `Ok(Box<dyn GateVerifier>)`: A gate instance of `GateVerifier` trait if gate has been found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_opening_gate(&self, gate_id: &str) -> Result<Box<dyn GateVerifier>, String> {
        let repository = self.repository.borrow();
        let gate_info = repository
            .get_gate(gate_id)
            .ok_or_else(|| "Gate not found".to_string())?;

        let gate = self
            .gate_factory
            .create_gate(gate_info.gate_type.clone(), gate_info.key.clone())?;

        Ok(gate)
    }

    /// Opens a gate for a specific user.
    /// # Arguments
    /// * `gate`: The gate to be opened.
    /// * `user`: The user who is opening the gate.
    /// # Returns
    /// * `Ok((Gate, GateUserStatus))`: If the gate is opened successfully.
    /// * `Err(String)`: If there is an error during gate opening.
    pub fn open_gate(&self, gate: Gate, user: Principal) -> Result<(Gate, GateUserStatus), String> {
        let repository = self.repository.borrow_mut();
        repository.open_gate(gate, user)
    }

    /// Retrieves the user status of a gate for a specific user.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be checked.
    /// * `user`: The user for whom the gate status is to be checked.
    /// # Returns
    /// * `Ok(Some(GateUserStatus))`: If the gate user status is found.
    /// * `Ok(None)`: If no gate user status is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_user_status(&self, gate_id: &str, user: Principal) -> Option<GateUserStatus> {
        let repository = self.repository.borrow();
        repository.get_gate_user_status(gate_id, user)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::gate_service_fixture;
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use gate_service_types::GateStatus;

    #[test]
    fn it_should_add_gate() {
        // Arrange
        let service = gate_service_fixture();
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
            let created_gate = service.add_gate(gate.clone()).unwrap();

            // Assert
            assert!(!created_gate.id.is_empty());
            assert_eq!(created_gate.subject_id, gate.subject_id);
            assert_eq!(created_gate.gate_type, gate.gate_type);
            if gate.gate_type == GateType::Password {
                if let GateKey::Password(p) = created_gate.key {
                    assert!(p.is_empty());
                } else {
                    panic!("Expected Password gate key");
                }
            } else {
                assert_eq!(created_gate.key, gate.key);
            }
        }
    }

    #[test]
    fn it_should_none_get_gate() {
        // Arrange
        let service = gate_service_fixture();

        // Act
        let gate = service.get_gate("non_existent_gate_id");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_password_gate() {
        // Arrange
        let service = gate_service_fixture();
        let new_gate = NewGate {
            subject_id: "owner1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(new_gate).unwrap();

        // Act
        let gate = service.get_gate(&gate.id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert_eq!(gate.gate_type, GateType::Password);
        assert_eq!(gate.key, GateKey::Password("".to_string()));
    }

    #[test]
    fn it_should_get_xfollowing_gate() {
        // Arrange
        let service = gate_service_fixture();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            gate_type: GateType::XFollowing,
            key: GateKey::XFollowing("x_handle".to_string()),
        };
        let gate = service.add_gate(new_gate).unwrap();

        // Act
        let gate = service.get_gate(&gate.id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert_eq!(gate.gate_type, GateType::XFollowing);
        assert_eq!(gate.key, GateKey::XFollowing("x_handle".to_string()));
    }

    #[test]
    fn it_should_none_get_gate_by_subject_id() {
        // Arrange
        let service = gate_service_fixture();

        // Act
        let gate = service.get_gate_by_owner("non_existent_subject_id");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_password_gate_by_subject_id() {
        // Arrange
        let service = gate_service_fixture();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        service.add_gate(new_gate).unwrap();

        // Act
        let gate = service.get_gate_by_owner(&subject_id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert_eq!(gate.gate_type, GateType::Password);
        assert_eq!(gate.key, GateKey::Password("".to_string()));
    }

    #[test]
    fn it_should_get_xfollowing_gate_by_subject_id() {
        // Arrange
        let service = gate_service_fixture();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            gate_type: GateType::XFollowing,
            key: GateKey::XFollowing("x_handle".to_string()),
        };
        service.add_gate(new_gate).unwrap();

        // Act
        let gate = service.get_gate_by_owner(&subject_id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert_eq!(gate.gate_type, GateType::XFollowing);
        assert_eq!(gate.key, GateKey::XFollowing("x_handle".to_string()));
    }

    #[test]
    fn it_should_error_get_opening_gate_due_to_non_existent_gate() {
        // Arrange
        let service = gate_service_fixture();

        // Act
        let result = service.get_opening_gate("non_existent_gate_id");

        // Assert
        assert!(result.is_err());
        if let Err(e) = result {
            assert_eq!(e, "Gate not found".to_string());
        } else {
            panic!("Expected error but got success");
        }
    }

    #[test]
    fn it_should_error_get_opening_gate_due_to_unsupported_gate_type() {
        // Arrange
        let service = gate_service_fixture();
        let new_gate = NewGate {
            subject_id: "owner1".to_string(),
            gate_type: GateType::XFollowing,
            key: GateKey::XFollowing("x_handle".to_string()),
        };
        let gate = service.add_gate(new_gate).unwrap();

        // Act
        let result = service.get_opening_gate(&gate.id);

        // Assert
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(e.contains("Unsupported gate type"));
        } else {
            panic!("Expected error but got success");
        }
    }

    #[test]
    fn it_should_get_opening_gate_password() {
        // Arrange
        let service = gate_service_fixture();
        let new_gate = NewGate {
            subject_id: "owner1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(new_gate).unwrap();

        // Act
        let result = service.get_opening_gate(&gate.id);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_open_password_gate() {
        // Arrange
        let service = gate_service_fixture();
        let new_gate = NewGate {
            subject_id: "owner1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(new_gate).unwrap();
        let user = random_principal_id();

        // Act
        let result = service.open_gate(gate.clone(), user);

        // Assert
        assert!(result.is_ok());
        let (result_gate, gate_user_status) = result.unwrap();
        assert_eq!(result_gate.id, gate.id);
        assert_eq!(gate_user_status.gate_id, gate.id);
        assert_eq!(gate_user_status.user_id, user);
        assert_eq!(gate_user_status.status, GateStatus::Open);
    }

    #[test]
    fn it_should_none_get_gate_user_status() {
        // Arrange
        let service = gate_service_fixture();
        let user = random_principal_id();

        // Act
        let result = service.get_gate_user_status("non_existent_gate_id", user);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_get_password_gate_user_status() {
        // Arrange
        let service = gate_service_fixture();
        let new_gate = NewGate {
            subject_id: "owner1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(new_gate).unwrap();
        let user = random_principal_id();
        let _ = service.open_gate(gate.clone(), user);

        // Act
        let result = service.get_gate_user_status(&gate.id, user);

        // Assert
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.gate_id, gate.id);
        assert_eq!(result.user_id, user);
        assert_eq!(result.status, GateStatus::Open);
    }
}
