pub mod admin;
pub mod gate;
pub mod init_and_upgrade;
mod state;

use candid::Principal;
use gate_service_types::{
    auth::Permission, error::GateServiceError, init::GateServiceInitData, Gate, GateForUser,
    GateKey, NewGate, OpenGateSuccessResult,
};

// Enable Candid export
ic_cdk::export_candid!();
