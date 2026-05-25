// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::error::CanisterError;
use gate_service_types::{Gate, GateKey, NewGate, OpenGateSuccessResult};

/// Abstracts inter-canister calls to the GateService canister for testability.
pub trait GateServiceClient {
    /// Creates a new gate in the GateService canister.
    async fn add_gate(&self, new_gate: NewGate) -> Result<Gate, CanisterError>;

    /// Opens a gate for the caller using the provided key.
    async fn open_gate(
        &self,
        gate_id: String,
        key: GateKey,
    ) -> Result<OpenGateSuccessResult, CanisterError>;

    /// Updates the canister ID used for subsequent calls.
    fn set_canister_id(&mut self, canister_id: Principal);
}
