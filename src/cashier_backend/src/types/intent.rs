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
}

impl Intent {
    pub fn new(
        id: String,
        creator_id: String,
        link_id: String,
        state: String,
        intent_type: String,
    ) -> Self {
        Self {
            id,
            creator_id,
            link_id,
            state,
            intent_type,
        }
    }

    pub fn to_persistence(&self) -> crate::repositories::entities::intent::Intent {
        crate::repositories::entities::intent::Intent::new(
            self.id.clone(),
            self.state.clone().to_string(),
            self.intent_type.clone().to_string(),
            self.link_id.clone(),
            self.creator_id.clone(),
        )
    }

    pub fn from_persistence(intent: crate::repositories::entities::intent::Intent) -> Self {
        Self {
            id: intent.pk.split('#').last().unwrap().to_string(),
            creator_id: intent.creator_id,
            link_id: intent.link_id,
            state: intent.state,
            intent_type: intent.intent_type,
        }
    }
}
