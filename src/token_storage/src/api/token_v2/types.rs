use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddTokenInput {
    pub token_id: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddTokensInput {
    pub token_ids: Vec<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UpdateTokenInput {
    pub token_id: String,
    pub is_enabled: bool,
}
