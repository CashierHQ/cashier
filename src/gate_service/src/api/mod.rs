// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod admin;
pub mod gate;
pub mod init_and_upgrade;
mod state;

use candid::Principal;
use gate_service_types::{
    Gate, GateForUser, GateKey, NewGate, OpenGateSuccessResult, PasswordHashingAlgorithm,
    SecretStorageMode, XTokenExchangeResult, auth::Permission, error::GateServiceError,
    init::GateServiceInitData,
};

// Enable Candid export
ic_cdk::export_candid!();