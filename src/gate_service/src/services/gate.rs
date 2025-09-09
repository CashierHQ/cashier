use crate::{
    gates::{GateFactory, GateVerifier},
    repositories::{Repositories, gate::GateRepository},
    utils::{gate::redact_password_gate, hashing::hash_password},
};
use candid::Principal;
use gate_service_types::{
    Gate, GateForUser, GateKey, GateUserStatus, NewGate, OpenGateSuccessResult, VerificationResult,
    error::GateServiceError,
};
use std::rc::Rc;

pub struct GateService<R: Repositories> {
    repository: GateRepository<R::Gate, R::GateUserStatus>,
    gate_factory: GateFactory,
}

impl<R: Repositories> GateService<R> {
    pub fn new(repositories: Rc<R>) -> Self {
        Self {
            repository: repositories.gate(),
            gate_factory: GateFactory {},
        }
    }

    /// Create a new gate and associate it with its subject.
    /// # Arguments
    /// * `creator`: The creator of the gate.
    /// * `new_gate`: The details of the new gate to be created.
    /// # Returns
    /// * `Ok(Gate)`: If the gate is created successfully.
    /// * `Err(String)`: If there is an error during gate creation.
    pub fn add_gate(
        &mut self,
        creator: Principal,
        new_gate: NewGate,
    ) -> Result<Gate, GateServiceError> {
        let gate_key = match &new_gate.key {
            GateKey::Password(password) => {
                let hashed_password =
                    hash_password(password).map_err(GateServiceError::HashingFailed)?;
                GateKey::Password(hashed_password)
            }
            _ => new_gate.key.clone(),
        };

        let gate = self
            .repository
            .create_gate(
                creator,
                NewGate {
                    key: gate_key,
                    ..new_gate
                },
            )
            .map_err(GateServiceError::RepositoryError)?;

        Ok(redact_password_gate(gate))
    }

    /// Retrieves a gate by its ID
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If the gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate(&self, gate_id: &str) -> Option<Gate> {
        self.repository.get_gate(gate_id).map(redact_password_gate)
    }

    /// Retrieves a gate by its subject's ID.
    /// # Arguments
    /// * `subject_id`: The ID of the subject whose gate is to be retrieved.
    /// # Returns
    /// * `Ok(Some(Gate))`: If a gate is found.
    /// * `Ok(None)`: If no gate is found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_by_subject(&self, creator: Principal, subject_id: &str) -> Option<Gate> {
        self.repository
            .get_gate_by_subject(creator, subject_id)
            .map(redact_password_gate)
    }

    /// Retrieves a gate that is currently being opened.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be checked.
    /// # Returns
    /// * `Ok(Box<dyn GateVerifier>)`: A gate instance of `GateVerifier` trait if gate has been found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_opening_gate(
        &self,
        gate_id: &str,
    ) -> Result<Box<dyn GateVerifier>, GateServiceError> {
        let gate_info = self
            .repository
            .get_gate(gate_id)
            .ok_or(GateServiceError::NotFound)?;

        let gate = self.gate_factory.get_gate_verifier(gate_info.key.clone())?;

        Ok(gate)
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
        self.repository.get_gate_user_status(gate_id, user)
    }

    /// Retrieves a gate with its status for a specific user.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be checked.
    /// * `user`: The user for whom the gate status is to be checked.
    /// # Returns
    /// * `Ok(GateForUser)`: If the gate and user status are found.
    /// * `Err(String)`: If there is an error during retrieval.
    pub fn get_gate_for_user(
        &self,
        gate_id: &str,
        user: Principal,
    ) -> Result<GateForUser, GateServiceError> {
        let gate = self.get_gate(gate_id).ok_or(GateServiceError::NotFound)?;
        let gate_user_status = self.get_gate_user_status(gate_id, user);
        Ok(GateForUser {
            gate,
            gate_user_status,
        })
    }

    /// Opens a gate for caller if the provided key is valid.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to be opened.
    /// * `key`: The key to be used for opening the gate.
    /// # Returns
    /// * `Ok(OpenGateSuccessResult)`: If the gate is opened successfully.
    /// * `Err(String)`: If there is an error during gate opening.
    pub async fn open_gate(
        &mut self,
        gate_id: &str,
        key: GateKey,
        user: Principal,
    ) -> Result<OpenGateSuccessResult, GateServiceError> {
        let gate = self.get_gate(gate_id);
        let gate = gate.ok_or(GateServiceError::NotFound)?;

        let opening_gate = self.get_opening_gate(gate_id)?;

        match opening_gate.verify(key).await {
            Ok(VerificationResult::Success) => {
                let (gate, gate_user_status) = self
                    .repository
                    .open_gate(gate, user)
                    .map_err(GateServiceError::RepositoryError)?;

                Ok(OpenGateSuccessResult {
                    gate,
                    gate_user_status,
                })
            }
            Ok(VerificationResult::Failure(e)) => Err(GateServiceError::KeyVerificationFailed(e)),
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use gate_service_types::GateStatus;

    /// Generate a fixture for the gate service using a stable gate repository.
    fn gate_service_fixture() -> GateService<TestRepositories> {
        GateService::new(Rc::new(TestRepositories::new()))
    }

    #[test]
    fn it_should_add_gate() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let gates = vec![
            NewGate {
                subject_id: "subject1".to_string(),
                key: GateKey::Password("password123".to_string()),
            },
            NewGate {
                subject_id: "subject2".to_string(),
                key: GateKey::XFollowing("x_handle".to_string()),
            },
            NewGate {
                subject_id: "subject3".to_string(),
                key: GateKey::TelegramGroup("telegram_group_id".to_string()),
            },
            NewGate {
                subject_id: "subject4".to_string(),
                key: GateKey::DiscordServer("discord_server_id".to_string()),
            },
        ];

        for gate in gates {
            // Act
            let created_gate = service.add_gate(creator, gate.clone()).unwrap();

            // Assert
            assert!(!created_gate.id.is_empty());
            assert_eq!(created_gate.creator, creator);
            assert_eq!(created_gate.subject_id, gate.subject_id);
            if let GateKey::Password(_) = gate.key {
                assert_eq!(created_gate.key, GateKey::PasswordRedacted);
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
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();

        // Act
        let gate = service.get_gate(&gate.id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, "subject1".to_string());
        assert_eq!(gate.key, GateKey::PasswordRedacted);
    }

    #[test]
    fn it_should_get_xfollowing_gate() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            key: GateKey::XFollowing("x_handle".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();

        // Act
        let gate = service.get_gate(&gate.id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
        assert_eq!(gate.key, GateKey::XFollowing("x_handle".to_string()));
    }

    #[test]
    fn it_should_none_get_gate_by_subject_id() {
        // Arrange
        let service = gate_service_fixture();
        let creator = random_principal_id();

        // Act
        let gate = service.get_gate_by_subject(creator, "non_existent_subject_id");

        // Assert
        assert!(gate.is_none());
    }

    #[test]
    fn it_should_get_password_gate_by_subject_id() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            key: GateKey::Password("password123".to_string()),
        };
        service.add_gate(creator, new_gate).unwrap();

        // Act
        let gate = service.get_gate_by_subject(creator, &subject_id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
        assert_eq!(gate.key, GateKey::PasswordRedacted);
    }

    #[test]
    fn it_should_get_xfollowing_gate_by_subject_id() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let new_gate = NewGate {
            subject_id: subject_id.clone(),
            key: GateKey::XFollowing("x_handle".to_string()),
        };
        service.add_gate(creator, new_gate).unwrap();

        // Act
        let gate = service.get_gate_by_subject(creator, &subject_id);

        // Assert
        assert!(gate.is_some());
        let gate = gate.unwrap();
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
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
        if let Err(GateServiceError::NotFound) = result {
        } else {
            panic!("Expected error but got success");
        }
    }

    #[test]
    fn it_should_error_get_opening_gate_due_to_unsupported_gate_type() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::XFollowing("x_handle".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();

        // Act
        let result = service.get_opening_gate(&gate.id);

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::UnsupportedGateKey(e)) = result {
            assert!(e.contains("XFollowing"));
        } else {
            panic!("Expected error but got success");
        }
    }

    #[test]
    fn it_should_get_opening_gate_password() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();

        // Act
        let result = service.get_opening_gate(&gate.id);

        // Assert
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn it_should_open_password_gate() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();
        let gate_key = GateKey::Password("password123".to_string());
        let user = random_principal_id();

        // Act
        let result = service.open_gate(&gate.id, gate_key, user).await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate.id, gate.id);
        assert_eq!(result.gate_user_status.status, GateStatus::Open);
        assert_eq!(result.gate_user_status.user_id, user);
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

    #[tokio::test]
    async fn it_should_get_password_gate_for_user() {
        // Arrange
        let mut service = gate_service_fixture();
        let creator = random_principal_id();
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };
        let gate = service.add_gate(creator, new_gate).unwrap();
        let gate_key = GateKey::Password("password123".to_string());
        let user = random_principal_id();
        let _ = service.open_gate(&gate.id, gate_key, user).await;

        // Act
        let result = service.get_gate_for_user(&gate.id, user);

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.gate.id, gate.id);
        assert!(result.gate_user_status.is_some());
        let gate_user_status = result.gate_user_status.unwrap();
        assert_eq!(gate_user_status.gate_id, gate.id);
        assert_eq!(gate_user_status.user_id, user);
        assert_eq!(gate_user_status.status, GateStatus::Open);
    }
}
