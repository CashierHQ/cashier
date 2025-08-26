use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CanisterCall {
    pub canister_id: String,
    pub method: String,
    pub arg: String,
}
