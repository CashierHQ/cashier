// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use gate_service_types::{
    Gate, GateForUser, GateKey, NewGate, OpenGateSuccessResult, PasswordHashingAlgorithm, XProfile,
    auth::Permission, error::GateServiceError,
};
use ic_mple_client::{CanisterClient, CanisterClientResult};

/// Typed client for the `gate_service` canister.
#[derive(Debug, Clone)]
pub struct GateServiceBackendClient<C>
where
    C: CanisterClient,
{
    /// The underlying IC canister client.
    client: C,
}

impl<C: CanisterClient> GateServiceBackendClient<C> {
    /// Creates a new `GateServiceBackendClient`.
    /// # Arguments
    /// * `client`: The underlying canister client used to make IC calls.
    /// # Returns
    /// A new `GateServiceBackendClient` wrapping the provided client.
    pub fn new(client: C) -> Self {
        Self { client }
    }

    /// Returns the permissions of a principal.
    /// # Arguments
    /// * `principal`: The IC principal to look up.
    /// # Returns
    /// * `Ok(Vec<Permission>)`: The permission list currently held by that principal (empty if none).
    /// * `Err(...)`: The canister call failed.
    pub async fn admin_permissions_get(
        &self,
        principal: Principal,
    ) -> CanisterClientResult<Vec<Permission>> {
        self.client
            .query("admin_permissions_get", (principal,))
            .await
    }

    /// Adds permissions to a principal and returns the updated permission list.
    /// # Arguments
    /// * `principal`: The IC principal to grant permissions to.
    /// * `permissions`: The set of permissions to add.
    /// # Returns
    /// * `Ok(Ok(Vec<Permission>))`: The full updated permission list for the principal.
    /// * `Ok(Err(GateServiceError))`: The canister rejected the request (e.g. caller is not admin).
    /// * `Err(...)`: The canister call failed.
    pub async fn admin_permissions_add(
        &self,
        principal: Principal,
        permissions: Vec<Permission>,
    ) -> CanisterClientResult<Result<Vec<Permission>, GateServiceError>> {
        self.client
            .update("admin_permissions_add", (principal, permissions))
            .await
    }

    /// Removes permissions from a principal and returns the updated permission list.
    /// # Arguments
    /// * `principal`: The IC principal to revoke permissions from.
    /// * `permissions`: The set of permissions to remove.
    /// # Returns
    /// * `Ok(Ok(Vec<Permission>))`: The remaining permission list for the principal.
    /// * `Ok(Err(GateServiceError))`: The canister rejected the request (e.g. caller is not admin).
    /// * `Err(...)`: The canister call failed.
    pub async fn admin_permissions_remove(
        &self,
        principal: Principal,
        permissions: Vec<Permission>,
    ) -> CanisterClientResult<Result<Vec<Permission>, GateServiceError>> {
        self.client
            .update("admin_permissions_remove", (principal, permissions))
            .await
    }

    /// Creates a new gate and returns it.
    /// # Arguments
    /// * `new_gate`: Subject ID and key configuration for the gate to create.
    /// # Returns
    /// * `Ok(Ok(Gate))`: The newly created gate.
    /// * `Ok(Err(GateServiceError))`: The canister rejected the request.
    /// * `Err(...)`: The canister call failed.
    pub async fn add_gate(
        &self,
        new_gate: NewGate,
    ) -> CanisterClientResult<Result<Gate, GateServiceError>> {
        self.client.update("add_gate", (new_gate,)).await
    }

    /// Verifies the supplied key and records the gate as opened for the given user.
    /// # Arguments
    /// * `gate_id`: The ID of the gate to open.
    /// * `gate_key`: The credential supplied by the user (e.g. `Password("abc")`).
    /// * `user`: The principal of the user attempting to open the gate.
    /// # Returns
    /// * `Ok(Ok(OpenGateSuccessResult))`: Gate opened; contains the gate and its new user status.
    /// * `Ok(Err(GateServiceError))`: The key did not satisfy the gate, or the gate was not found.
    /// * `Err(...)`: The canister call failed.
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

    /// Returns the gate associated with the given subject ID for the caller.
    /// # Arguments
    /// * `subject_id`: The subject ID to look up (e.g. a link ID).
    /// # Returns
    /// * `Ok(Ok(Some(Gate)))`: Gate found.
    /// * `Ok(Ok(None))`: No gate exists for that subject.
    /// * `Ok(Err(GateServiceError))`: The canister rejected the request.
    /// * `Err(...)`: The canister call failed.
    pub async fn get_gate_by_subject(
        &self,
        subject_id: String,
    ) -> CanisterClientResult<Result<Option<Gate>, GateServiceError>> {
        self.client
            .query("get_gate_by_subject", (subject_id,))
            .await
    }

    /// Returns the gate with the given ID.
    /// # Arguments
    /// * `gate_id`: The unique gate ID to look up.
    /// # Returns
    /// * `Ok(Some(Gate))`: Gate found.
    /// * `Ok(None)`: No gate with that ID exists.
    /// * `Err(...)`: The canister call failed.
    pub async fn get_gate(&self, gate_id: String) -> CanisterClientResult<Option<Gate>> {
        self.client.query("get_gate", (gate_id,)).await
    }

    /// Returns a gate together with the given user's open/closed status for it.
    /// # Arguments
    /// * `gate_id`: The unique gate ID to look up.
    /// * `user`: The principal whose status to include.
    /// # Returns
    /// * `Ok(Ok(GateForUser))`: Gate and the user's status (status is `None` if never opened).
    /// * `Ok(Err(GateServiceError))`: The gate was not found or the request was rejected.
    /// * `Err(...)`: The canister call failed.
    pub async fn get_gate_for_user(
        &self,
        gate_id: String,
        user: Principal,
    ) -> CanisterClientResult<Result<GateForUser, GateServiceError>> {
        self.client
            .query("get_gate_for_user", (gate_id, user))
            .await
    }

    /// Returns the password hashing algorithm currently used for new password gates.
    /// # Returns
    /// * `Ok(PasswordHashingAlgorithm)`: The active algorithm (`Argon2` or `Sha256`).
    /// * `Err(...)`: The canister call failed.
    pub async fn admin_get_password_hashing_algorithm(
        &self,
    ) -> CanisterClientResult<PasswordHashingAlgorithm> {
        self.client
            .query("admin_get_password_hashing_algorithm", ())
            .await
    }

    /// Switches the password hashing algorithm used for all future password gate creations.
    /// # Arguments
    /// * `mode`: The new algorithm (`Argon2` for security, `Sha256` for speed on IC).
    /// # Returns
    /// * `Ok(Ok(()))`: Algorithm updated.
    /// * `Ok(Err(GateServiceError))`: The canister rejected the request (e.g. caller is not admin).
    /// * `Err(...)`: The canister call failed.
    pub async fn admin_set_password_hashing_algorithm(
        &self,
        mode: PasswordHashingAlgorithm,
    ) -> CanisterClientResult<Result<(), GateServiceError>> {
        self.client
            .update("admin_set_password_hashing_algorithm", (mode,))
            .await
    }

    /// Generates an OTP code and sends it to the destination configured on the gate.
    ///
    /// Passes `user` explicitly so that privileged callers (e.g. cashier_backend acting
    /// on behalf of an end-user) get the OTP stored under the correct principal.
    /// # Arguments
    /// * `gate_id`: The ID of an OTPEmail or OTPSms gate.
    /// * `user`: The principal of the end-user who will later verify the code.
    /// # Returns
    /// * `Ok(Ok(()))`: Code generated and dispatched via Brevo.
    /// * `Ok(Err(GateServiceError))`: Gate not found, not an OTP gate, or Brevo call failed.
    /// * `Err(...)`: The canister call failed.
    pub async fn send_otp(
        &self,
        gate_id: String,
        user: Principal,
    ) -> CanisterClientResult<Result<(), GateServiceError>> {
        self.client.update("send_otp", (gate_id, user)).await
    }

    /// Exchanges an X OAuth 2.0 authorization code for the caller's X profile and access token.
    /// # Arguments
    /// * `code`: The one-time authorization code received from the X OAuth callback.
    /// # Returns
    /// * `Ok(Ok(XProfile))`: The authenticated user's public X profile.
    /// * `Ok(Err(GateServiceError))`: Token exchange or profile fetch failed.
    /// * `Err(...)`: The canister call failed.
    pub async fn exchange_x_token(
        &self,
        code: String,
    ) -> CanisterClientResult<Result<XProfile, GateServiceError>> {
        self.client.update("exchange_x_token", (code,)).await
    }

    /// Stores a plain-text secret in the canister's plain-text secret store.
    /// # Arguments
    /// * `key`: Logical name for the secret (e.g. `"twitter_api_key"`).
    /// * `value`: Plaintext secret value.
    /// # Returns
    /// * `Ok(Ok(()))`: Secret stored.
    /// * `Ok(Err(GateServiceError))`: The canister rejected the request (e.g. caller is not admin).
    /// * `Err(...)`: The canister call failed.
    pub async fn admin_plain_secret_set(
        &self,
        key: String,
        value: String,
    ) -> CanisterClientResult<Result<(), GateServiceError>> {
        self.client
            .update("admin_plain_secret_set", (key, value))
            .await
    }
}
