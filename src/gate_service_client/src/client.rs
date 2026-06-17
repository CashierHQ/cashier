use candid::Principal;
use gate_service_types::{
    Gate, GateForUser, GateKey, NewGate, OpenGateSuccessResult, PasswordHashingAlgorithm, XProfile,
    auth::Permission, error::GateServiceError,
};
use ic_mple_client::{CanisterClient, CanisterClientResult};

/// An GateServiceBackend canister client.
#[derive(Debug, Clone)]
pub struct GateServiceBackendClient<C>
where
    C: CanisterClient,
{
    /// The canister client.
    client: C,
}

impl<C: CanisterClient> GateServiceBackendClient<C> {
    /// Create a new GateServiceBackendClient.
    ///
    /// # Arguments
    /// * `client` - The canister client.
    pub fn new(client: C) -> Self {
        Self { client }
    }

    /// Returns the permissions of a principal.
    pub async fn admin_permissions_get(
        &self,
        principal: Principal,
    ) -> CanisterClientResult<Vec<Permission>> {
        self.client
            .query("admin_permissions_get", (principal,))
            .await
    }

    /// Adds permissions to a principal and returns the principal permissions.
    pub async fn admin_permissions_add(
        &self,
        principal: Principal,
        permissions: Vec<Permission>,
    ) -> CanisterClientResult<Result<Vec<Permission>, GateServiceError>> {
        self.client
            .update("admin_permissions_add", (principal, permissions))
            .await
    }

    /// Removes permissions from a principal and returns the principal permissions.
    pub async fn admin_permissions_remove(
        &self,
        principal: Principal,
        permissions: Vec<Permission>,
    ) -> CanisterClientResult<Result<Vec<Permission>, GateServiceError>> {
        self.client
            .update("admin_permissions_remove", (principal, permissions))
            .await
    }

    /// Adds a new gate.
    pub async fn add_gate(
        &self,
        new_gate: NewGate,
    ) -> CanisterClientResult<Result<Gate, GateServiceError>> {
        self.client.update("add_gate", (new_gate,)).await
    }

    /// Opens a gate for the given user.
    pub async fn open_gate(
        &self,
        gate_id: String,
        gate_key: GateKey,
        user: Principal,
    ) -> CanisterClientResult<Result<OpenGateSuccessResult, GateServiceError>> {
        self.client
            .update("open_gate", (gate_id, gate_key, user))
            .await
    }

    /// Gets a gate by its subject ID.
    pub async fn get_gate_by_subject(
        &self,
        subject_id: String,
    ) -> CanisterClientResult<Result<Option<Gate>, GateServiceError>> {
        self.client
            .query("get_gate_by_subject", (subject_id,))
            .await
    }

    /// Gets a gate by its ID.
    pub async fn get_gate(&self, gate_id: String) -> CanisterClientResult<Option<Gate>> {
        self.client.query("get_gate", (gate_id,)).await
    }

    /// Gets a gate for a user.
    pub async fn get_gate_for_user(
        &self,
        gate_id: String,
        user: Principal,
    ) -> CanisterClientResult<Result<GateForUser, GateServiceError>> {
        self.client
            .query("get_gate_for_user", (gate_id, user))
            .await
    }

    /// Returns the current password hashing algorithm.
    pub async fn admin_get_password_hashing_algorithm(
        &self,
    ) -> CanisterClientResult<PasswordHashingAlgorithm> {
        self.client
            .query("admin_get_password_hashing_algorithm", ())
            .await
    }

    /// Sets the password hashing algorithm for future password gate creations.
    pub async fn admin_set_password_hashing_algorithm(
        &self,
        mode: PasswordHashingAlgorithm,
    ) -> CanisterClientResult<Result<(), GateServiceError>> {
        self.client
            .update("admin_set_password_hashing_algorithm", (mode,))
            .await
    }

    /// Exchanges an X OAuth 2.0 authorization code for the caller's X profile.
    pub async fn exchange_x_token(
        &self,
        code: String,
    ) -> CanisterClientResult<Result<XProfile, GateServiceError>> {
        self.client.update("exchange_x_token", (code,)).await
    }
}
