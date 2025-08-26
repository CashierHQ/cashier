use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
/// Canister call structure
/// This is used to build the canister call for ICRC-112
pub struct CanisterCall {
    pub canister_id: String,
    pub method: String,
    pub arg: String,
}
