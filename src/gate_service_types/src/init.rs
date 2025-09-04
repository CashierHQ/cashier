use candid::{CandidType, Principal};
use serde::Deserialize;

/// These are the arguments which are taken by the gate_service canister init fn
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GateServiceInitData {
    /// Owner of the canister
    pub owner: Principal,
}
