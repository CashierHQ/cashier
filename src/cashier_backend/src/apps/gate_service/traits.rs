// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::error::CanisterError;
use gate_service_types::{Gate, GateKey, NewGate, OpenGateSuccessResult};

/// Abstracts inter-canister calls to the GateService canister for testability.
pub trait GateServiceClient {
    /// Creates a new gate in the GateService canister.
    async fn add_gate(&self, new_gate: NewGate) -> Result<Gate, CanisterError>;

    /// Opens a gate for `user` using the provided key.
    async fn open_gate(
        &self,
        gate_id: String,
        key: GateKey,
        user: Principal,
    ) -> Result<OpenGateSuccessResult, CanisterError>;

    /// Generates an OTP code and sends it to the destination on the gate, keyed by `user`.
    async fn send_otp(&self, gate_id: String, user: Principal) -> Result<(), CanisterError>;

    /// Updates the canister ID used for subsequent calls.
    fn set_canister_id(&mut self, canister_id: Principal);
}
