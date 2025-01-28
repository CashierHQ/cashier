use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum IntentState {
    Created,
    Processing,
    Success,
    Fail,
}

impl IntentState {
    pub fn to_string(&self) -> String {
        match self {
            IntentState::Created => "Intent_state_created".to_string(),
            IntentState::Processing => "Intent_state_processing".to_string(),
            IntentState::Success => "Intent_state_success".to_string(),
            IntentState::Fail => "Intent_state_fail".to_string(),
        }
    }

    pub fn from_string(state: &str) -> Result<IntentState, String> {
        match state {
            "Intent_state_created" => Ok(IntentState::Created),
            "Intent_state_processing" => Ok(IntentState::Processing),
            "Intent_state_success" => Ok(IntentState::Success),
            "Intent_state_fail" => Ok(IntentState::Fail),
            _ => Err("Invalid intent state".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum IntentType {
    Create,
    Withdraw,
    Claim,
}

impl IntentType {
    pub fn to_string(&self) -> String {
        match self {
            IntentType::Create => "Create".to_string(),
            IntentType::Withdraw => "Withdraw".to_string(),
            IntentType::Claim => "Claim".to_string(),
        }
    }

    pub fn from_string(intent_type: &str) -> Result<IntentType, String> {
        match intent_type {
            "Create" => Ok(IntentType::Create),
            "Withdraw" => Ok(IntentType::Withdraw),
            "Claim" => Ok(IntentType::Claim),
            _ => Err("Invalid intent type".to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Intent {
    pub id: String,
    pub creator_id: String,
    pub link_id: String,
    pub state: String,
    pub intent_type: String,
    pub tx_map: Vec<Vec<String>>,
}

impl Intent {
    pub fn new(
        id: String,
        creator_id: String,
        link_id: String,
        state: String,
        intent_type: String,
        tx_maps: Vec<Vec<String>>,
    ) -> Self {
        Self {
            id,
            creator_id,
            link_id,
            state,
            intent_type,
            tx_map: tx_maps,
        }
    }
}
