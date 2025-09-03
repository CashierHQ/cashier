pub mod gate;
pub mod init_and_upgrade;

use candid::Principal;
use gate_service_types::{
    error::GateServiceError, Gate, GateForUser, GateKey, NewGate, OpenGateSuccessResult,
};

// Enable Candid export
ic_cdk::export_candid!();
