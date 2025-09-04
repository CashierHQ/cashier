use candid::Principal;
use gate_service_types::{
    Gate, GateKey, NewGate, OpenGateSuccessResult, auth::Permission, error::GateServiceError,
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

    /// Opens a gate.
    pub async fn open_gate(
        &self,
        gate_id: String,
        gate_key: GateKey,
    ) -> CanisterClientResult<Result<OpenGateSuccessResult, GateServiceError>> {
        self.client.update("open_gate", (gate_id, gate_key)).await
    }
}
