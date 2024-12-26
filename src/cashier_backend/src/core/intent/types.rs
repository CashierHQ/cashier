use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::{
    core::Intent,
    types::consent_messsage::{ConsentType, Fee, Receive, Send},
};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateIntentInput {
    pub intent_type: String,
    pub params: Option<CreateIntentParams>,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateIntentResponse {
    pub intent: Intent,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateIntentConsent {
    pub receive: Vec<Receive>,
    pub send: Vec<Send>,
    pub fee: Vec<Fee>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateIntentConsentResponse {
    pub intent: Intent,
    pub consents: CreateIntentConsent,
}

impl From<Vec<ConsentType>> for CreateIntentConsent {
    fn from(consents: Vec<ConsentType>) -> Self {
        let mut receive = Vec::new();
        let mut send = Vec::new();
        let mut fee = Vec::new();

        for consent in consents {
            match consent {
                ConsentType::Receive(r) => receive.push(r),
                ConsentType::Send(s) => send.push(s),
                ConsentType::Fee(f) => fee.push(f),
            }
        }

        CreateIntentConsent { receive, send, fee }
    }
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ClaimIntentParams {
    address: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum CreateIntentParams {
    Claim(ClaimIntentParams),
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UpdateIntentInput {
    pub intent_id: String,
    pub transaction_id: String,
    pub block_id: u64,
}
