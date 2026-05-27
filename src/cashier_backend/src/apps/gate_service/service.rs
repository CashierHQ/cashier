// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::error::CanisterError;
use gate_service_types::{
    Gate, GateForUser, GateKey, GateStatus, GateUserStatus, NewGate, OpenGateSuccessResult,
    error::GateServiceError,
};
use ic_cdk::call::{Call, CandidDecodeFailed};

use crate::{
    apps::{gate_service::traits::GateServiceClient, link_v3::traits::GateValidator},
    repositories::{
        Repositories, link_gate::LinkGateRepository,
        link_gate_user_status::LinkGateUserStatusRepository,
    },
};

/// Makes direct inter-canister calls to the GateService canister.
pub struct GateServiceWrapper {
    pub canister_id: Principal,
}

impl GateServiceWrapper {
    /// Creates a new `GateServiceWrapper`.
    /// # Arguments
    /// * `canister_id` - The Principal of the GateService canister to call
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }
}

impl Default for GateServiceWrapper {
    fn default() -> Self {
        Self {
            canister_id: Principal::anonymous(),
        }
    }
}

impl GateServiceClient for GateServiceWrapper {
    /// Add a gate to a link by calling to GateService
    /// # Arguments
    /// * `new_gate` - The gate metadata to create, including the `subject_id` (link ID) and `key`.
    /// # Returns
    /// * `Ok(Gate)` if the gate was successfully created in GateService.
    /// * `Err(CanisterError)` if the inter-canister call failed or if GateService returned an error.
    async fn add_gate(&self, new_gate: NewGate) -> Result<Gate, CanisterError> {
        let result = Call::bounded_wait(self.canister_id, "add_gate")
            .with_arg(&new_gate)
            .await
            .map_err(CanisterError::from)?;

        let parsed: Result<Result<Gate, GateServiceError>, CandidDecodeFailed> = result.candid();
        parsed
            .map_err(CanisterError::from)?
            .map_err(|e| CanisterError::HandleLogicError(format!("{e:?}")))
    }

    /// Open a gate for a user by calling to GateService
    /// # Arguments
    /// * `gate_id` - The ID of the gate to open.
    /// * `key` - The key to open the gate, e.g. password.
    /// # Returns
    /// * `Ok(OpenGateSuccessResult)` if the gate was successfully opened in GateService.
    /// * `Err(CanisterError::Unauthorized)` if the gate key was incorrect.
    /// * `Err(CanisterError::NotFound)` if the gate_id does not exist in GateService.
    /// * `Err(CanisterError)` if the inter-canister call failed or if GateService returned an error.
    async fn open_gate(
        &self,
        gate_id: String,
        key: GateKey,
    ) -> Result<OpenGateSuccessResult, CanisterError> {
        let result = Call::bounded_wait(self.canister_id, "open_gate")
            .with_args(&(gate_id, key))
            .await
            .map_err(CanisterError::from)?;

        let parsed: Result<Result<OpenGateSuccessResult, GateServiceError>, CandidDecodeFailed> =
            result.candid();
        parsed.map_err(CanisterError::from)?.map_err(|e| match e {
            GateServiceError::KeyVerificationFailed(_) => {
                CanisterError::Unauthorized("Gate key verification failed".to_string())
            }
            other => CanisterError::HandleLogicError(format!("{other:?}")),
        })
    }

    /// Updates the canister ID used for all GateService calls.
    /// # Arguments
    /// * `canister_id` - The new Principal of the GateService canister to call
    fn set_canister_id(&mut self, canister_id: Principal) {
        self.canister_id = canister_id;
    }
}

/// Coordinates local gate-ID and status caches with remote GateService calls.
pub struct GateAppService<R: Repositories, G: GateServiceClient> {
    pub link_gate_repository: LinkGateRepository<R::LinkGate>,
    pub link_gate_user_status_repository: LinkGateUserStatusRepository<R::LinkGateUserStatus>,
    pub gate_client: G,
}

impl<R: Repositories, G: GateServiceClient> GateAppService<R, G> {
    /// Creates a new `GateAppService`.
    /// # Arguments
    /// * `repo` - The repositories to use for local caching of gate metadata and user gate open status.
    /// * `gate_client` - The client to use for making inter-canister calls to the GateService canister.
    pub fn new(repo: &R, gate_client: G) -> Self {
        Self {
            link_gate_repository: repo.link_gate(),
            link_gate_user_status_repository: repo.link_gate_user_status(),
            gate_client,
        }
    }

    /// Updates the canister ID used for all GateService calls.
    /// # Arguments
    /// * `canister_id` - The new Principal of the GateService canister to call.
    pub fn set_canister_id(&mut self, canister_id: Principal) {
        self.gate_client.set_canister_id(canister_id);
    }

    /// Creates a gate in GateService for a link and caches the returned gate locally.
    /// Called after link creation. The `subject_id` of the new gate is the link ID.
    /// # Arguments
    /// * `link_id` - The ID of the link to add the gate to.
    /// * `gate_key` - The key for the gate, e.g. a password
    /// # Returns
    /// * `Ok(Gate)` if the gate was successfully created in GateService and cached locally.
    /// * `Err(CanisterError)` if the inter-canister call failed or if GateService returned an error. In this case no local cache is written.
    pub async fn add_gate_for_link(
        &mut self,
        link_id: &str,
        gate_key: GateKey,
    ) -> Result<Gate, CanisterError> {
        let new_gate = NewGate {
            subject_id: link_id.to_string(),
            key: gate_key,
        };
        let gate = self.gate_client.add_gate(new_gate).await?;
        self.link_gate_repository.add_gate(link_id, gate.clone());
        Ok(gate)
    }

    /// Checks that all gates for `link_id` have been opened by `user` using the local cache.
    /// # Arguments
    /// * `link_id` - The ID of the link to check gates for.
    /// * `user` - The Principal of the user to check gate open status for.
    /// # Returns
    /// * `Ok(())` if all gates for the link are marked Open in the local cache for this user, or if the link has no gates.
    /// * `Err(CanisterError::Unauthorized)` if any gate for the link is not marked Open in the local cache for this user. Note that this may be a false negative if the user has opened the gate but the cache has not been updated yet.
    /// * `Err(CanisterError)` if there was an error reading from the local cache.
    pub fn check_all_gates_open(
        &self,
        link_id: &str,
        user: Principal,
    ) -> Result<(), CanisterError> {
        let Some(link_gate) = self.link_gate_repository.get(link_id) else {
            return Ok(());
        };
        if link_gate.gates.is_empty() {
            return Ok(());
        }

        for gate in &link_gate.gates {
            let cached = self
                .link_gate_user_status_repository
                .get(link_id, user, &gate.id);
            match cached {
                Some(status) if status.status == GateStatus::Open => {}
                _ => {
                    return Err(CanisterError::Unauthorized(
                        "Gate is not opened for this user".to_string(),
                    ));
                }
            }
        }
        Ok(())
    }

    /// Open a gate for a user by calling to GateService, and cache the open status locally if successful.
    /// # Arguments
    /// * `link_id` - The ID of the link the gate belongs to, used for caching the open status locally.
    /// * `gate_id` - The ID of the gate to open.
    /// * `user` - The Principal of the user opening the gate, used for caching the open status locally.
    /// * `gate_key` - The key to open the gate, e.g. password.
    /// # Returns
    /// * `Ok(OpenGateSuccessResult)` if the gate was successfully opened in GateService. The open status is cached locally for the user.
    /// * `Err(CanisterError::Unauthorized)` if the gate key was incorrect. The open status is NOT cached locally in this case.
    /// * `Err(CanisterError::NotFound)` if the gate_id does not exist in GateService. The open status is NOT cached locally in this case.
    /// * `Err(CanisterError)` if the inter-canister call failed or if GateService returned an error. The open status is NOT cached locally in this case.
    pub async fn open_link_gate(
        &mut self,
        link_id: &str,
        gate_id: &str,
        user: Principal,
        gate_key: GateKey,
    ) -> Result<OpenGateSuccessResult, CanisterError> {
        let link_gate = self
            .link_gate_repository
            .get(link_id)
            .ok_or_else(|| CanisterError::NotFound("No gates found for link".to_string()))?;

        if !link_gate.gates.iter().any(|g| g.id == gate_id) {
            return Err(CanisterError::NotFound(format!(
                "Gate {gate_id} not found for link"
            )));
        }

        let result = self
            .gate_client
            .open_gate(gate_id.to_string(), gate_key)
            .await?;

        // Cache the open status so create_action checks don't need an inter-canister call
        self.link_gate_user_status_repository
            .set_open(link_id, user, gate_id);

        Ok(result)
    }

    /// Get all the gates for a link along with the open status for a user.
    ///
    /// # Arguments
    /// * `link_id` - The ID of the link to get gates for.
    /// * `user` - The Principal of the user to get gate open status for.
    /// # Returns
    /// * `Ok(Vec<GateForUser>)` if the link exists. Each gate in the link is included, even if the user has never opened it (in which case `gate_user_status` will be `None` for that gate).
    /// * `Err(CanisterError)` if there was an error reading from the local cache.
    pub fn get_gates_for_link(
        &self,
        link_id: &str,
        user: Principal,
    ) -> Result<Vec<GateForUser>, CanisterError> {
        let Some(link_gate) = self.link_gate_repository.get(link_id) else {
            return Ok(vec![]);
        };

        let gates = link_gate
            .gates
            .into_iter()
            .map(|gate| {
                let cached = self
                    .link_gate_user_status_repository
                    .get(link_id, user, &gate.id);
                let gate_user_status = cached.map(|s| GateUserStatus {
                    gate_id: gate.id.clone(),
                    user_id: user,
                    status: s.status,
                });
                GateForUser {
                    gate,
                    gate_user_status,
                }
            })
            .collect();

        Ok(gates)
    }
}

impl<R: Repositories, G: GateServiceClient> GateValidator for GateAppService<R, G> {
    /// Checks that all gates for `link_id` have been opened by `user` using the local cache.
    /// # Arguments
    /// * `link_id` - The ID of the link to check gates for.
    /// * `user` - The Principal of the user to check gate open status for.
    /// # Returns
    /// * `Ok(())` if all gates for the link are marked Open in the local cache for this user, or if the link has no gates.
    /// * `Err(CanisterError::Unauthorized)` if any gate for the link is not marked Open in the local cache for this user. Note that this may be a false negative if the user has opened the gate but the cache has not been updated yet.
    /// * `Err(CanisterError)` if there was an error reading from the local cache.
    fn check_all_gates_open(&self, link_id: &str, user: Principal) -> Result<(), CanisterError> {
        self.check_all_gates_open(link_id, user)
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use gate_service_types::GateUserStatus;

    pub struct MockGateServiceClient {
        pub add_gate_result: Option<Result<Gate, CanisterError>>,
        pub open_gate_result: Option<Result<OpenGateSuccessResult, CanisterError>>,
    }

    impl MockGateServiceClient {
        pub fn new() -> Self {
            Self {
                add_gate_result: None,
                open_gate_result: None,
            }
        }
    }

    impl GateServiceClient for MockGateServiceClient {
        async fn add_gate(&self, _new_gate: NewGate) -> Result<Gate, CanisterError> {
            self.add_gate_result
                .clone()
                .unwrap_or_else(|| Err(CanisterError::HandleLogicError("not set".to_string())))
        }

        async fn open_gate(
            &self,
            _gate_id: String,
            _key: GateKey,
        ) -> Result<OpenGateSuccessResult, CanisterError> {
            self.open_gate_result
                .clone()
                .unwrap_or_else(|| Err(CanisterError::HandleLogicError("not set".to_string())))
        }

        fn set_canister_id(&mut self, _canister_id: Principal) {}
    }

    fn fixture_of_gate(gate_id: &str, subject_id: &str) -> Gate {
        Gate {
            id: gate_id.to_string(),
            creator: random_principal_id(),
            subject_id: subject_id.to_string(),
            key: GateKey::PasswordRedacted,
        }
    }

    fn fixture_of_open_gate_result(gate: Gate, user: Principal) -> OpenGateSuccessResult {
        let gate_id = gate.id.clone();
        OpenGateSuccessResult {
            gate,
            gate_user_status: GateUserStatus {
                gate_id,
                user_id: user,
                status: GateStatus::Open,
            },
        }
    }

    fn make_service(
        repo: &TestRepositories,
        mock: MockGateServiceClient,
    ) -> GateAppService<TestRepositories, MockGateServiceClient> {
        GateAppService::new(repo, mock)
    }

    #[tokio::test]
    async fn it_should_fail_add_gate_for_link_due_to_client_error() {
        // Arrange
        let repo = TestRepositories::new();
        let mut mock = MockGateServiceClient::new();
        mock.add_gate_result = Some(Err(CanisterError::HandleLogicError(
            "gate service error".to_string(),
        )));
        let mut svc = make_service(&repo, mock);
        let link_id = random_id_string();

        // Act
        let result = svc
            .add_gate_for_link(&link_id, GateKey::Password("secret".to_string()))
            .await;

        // Assert
        assert!(result.is_err());
        // gate_id must NOT have been stored locally
        assert!(repo.link_gate().get(&link_id).is_none());
    }

    #[tokio::test]
    async fn it_should_fail_open_gate_due_to_unknown_gate_id() {
        // Arrange
        let repo = TestRepositories::new();
        let link_id = random_id_string();
        let gate_id = format!("gate_{}", random_id_string());
        let unknown_gate_id = format!("gate_{}", random_id_string());
        let user = random_principal_id();

        repo.link_gate()
            .add_gate(&link_id, fixture_of_gate(&gate_id, &link_id));

        let mut svc = make_service(&repo, MockGateServiceClient::new());

        // Act
        let result = svc
            .open_link_gate(
                &link_id,
                &unknown_gate_id,
                user,
                GateKey::Password("secret".to_string()),
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[tokio::test]
    async fn it_should_fail_open_gate_due_to_wrong_key() {
        // Arrange
        let repo = TestRepositories::new();
        let link_id = random_id_string();
        let gate_id = format!("gate_{}", random_id_string());
        let user = random_principal_id();

        repo.link_gate()
            .add_gate(&link_id, fixture_of_gate(&gate_id, &link_id));

        let mut mock = MockGateServiceClient::new();
        mock.open_gate_result = Some(Err(CanisterError::Unauthorized(
            "Gate key verification failed".to_string(),
        )));
        let mut svc = make_service(&repo, mock);

        // Act
        let result = svc
            .open_link_gate(
                &link_id,
                &gate_id,
                user,
                GateKey::Password("wrong".to_string()),
            )
            .await;

        // Assert
        assert!(result.is_err());
        // cache must NOT have been written
        assert!(
            repo.link_gate_user_status()
                .get(&link_id, user, &gate_id)
                .is_none()
        );
    }

    #[tokio::test]
    async fn it_should_fail_check_gates_due_to_missing_cache_entry() {
        // Arrange
        let repo = TestRepositories::new();
        let link_id = random_id_string();
        let gate_id = format!("gate_{}", random_id_string());
        let user = random_principal_id();

        // gate exists but user has never opened it
        repo.link_gate()
            .add_gate(&link_id, fixture_of_gate(&gate_id, &link_id));

        let svc = make_service(&repo, MockGateServiceClient::new());

        // Act
        let result = svc.check_all_gates_open(&link_id, user);

        // Assert
        assert!(result.is_err());
        assert!(matches!(result, Err(CanisterError::Unauthorized(_))));
    }

    #[tokio::test]
    async fn it_should_add_gate_for_link() {
        // Arrange
        let repo = TestRepositories::new();
        let link_id = random_id_string();
        let gate_id = format!("gate_{}", random_id_string());
        let gate = fixture_of_gate(&gate_id, &link_id);

        let mut mock = MockGateServiceClient::new();
        mock.add_gate_result = Some(Ok(gate.clone()));
        let mut svc = make_service(&repo, mock);

        // Act
        let result = svc
            .add_gate_for_link(&link_id, GateKey::Password("secret".to_string()))
            .await;

        // Assert
        assert!(result.is_ok());
        let stored = repo.link_gate().get(&link_id);
        assert!(stored.is_some());
        assert!(stored.unwrap().gates.iter().any(|g| g.id == gate_id));
    }

    #[tokio::test]
    async fn it_should_check_gates_open_for_ungated_link() {
        // Arrange — link has no gates
        let repo = TestRepositories::new();
        let link_id = random_id_string();
        let user = random_principal_id();
        let svc = make_service(&repo, MockGateServiceClient::new());

        // Act
        let result = svc.check_all_gates_open(&link_id, user);

        // Assert — ungated links pass immediately
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn it_should_open_link_gate_and_cache_status() {
        // Arrange
        let repo = TestRepositories::new();
        let link_id = random_id_string();
        let gate_id = format!("gate_{}", random_id_string());
        let user = random_principal_id();
        let gate = fixture_of_gate(&gate_id, &link_id);
        let open_result = fixture_of_open_gate_result(gate.clone(), user);

        repo.link_gate().add_gate(&link_id, gate);

        let mut mock = MockGateServiceClient::new();
        mock.open_gate_result = Some(Ok(open_result));
        let mut svc = make_service(&repo, mock);

        // Act
        let result = svc
            .open_link_gate(
                &link_id,
                &gate_id,
                user,
                GateKey::Password("secret".to_string()),
            )
            .await;

        // Assert — call succeeded and cache was written
        assert!(result.is_ok());
        let cached = repo.link_gate_user_status().get(&link_id, user, &gate_id);
        assert!(cached.is_some());
        assert_eq!(cached.as_ref().unwrap().gate_id, gate_id);
        assert_eq!(cached.as_ref().unwrap().status, GateStatus::Open);
    }

    #[tokio::test]
    async fn it_should_pass_check_after_opening_gate() {
        // Arrange
        let repo = TestRepositories::new();
        let link_id = random_id_string();
        let gate_id = format!("gate_{}", random_id_string());
        let user = random_principal_id();

        repo.link_gate()
            .add_gate(&link_id, fixture_of_gate(&gate_id, &link_id));
        repo.link_gate_user_status()
            .set_open(&link_id, user, &gate_id);

        let svc = make_service(&repo, MockGateServiceClient::new());

        // Act
        let result = svc.check_all_gates_open(&link_id, user);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_get_gates_for_link_from_cache() {
        // Arrange
        let repo = TestRepositories::new();
        let link_id = random_id_string();
        let gate_id = format!("gate_{}", random_id_string());
        let user = random_principal_id();
        let gate = fixture_of_gate(&gate_id, &link_id);

        repo.link_gate().add_gate(&link_id, gate);
        repo.link_gate_user_status()
            .set_open(&link_id, user, &gate_id);

        let svc = make_service(&repo, MockGateServiceClient::new());

        // Act
        let result = svc.get_gates_for_link(&link_id, user);

        // Assert — gate metadata and status both from local cache, no inter-canister call
        assert!(result.is_ok());
        let gates = result.unwrap();
        assert_eq!(gates.len(), 1);
        assert_eq!(gates[0].gate.id, gate_id);
        assert!(gates[0].gate_user_status.is_some());
        assert_eq!(
            gates[0].gate_user_status.as_ref().unwrap().status,
            GateStatus::Open
        );
    }
}
