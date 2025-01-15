use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::{
    core::{Intent, IntentResp},
    types::{
        consent_messsage::{ConsentType, Fee, Receive, Send},
        icrcx_transaction::IcrcxResponses,
    },
};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateIntentInput {
    pub intent_type: String,
    pub params: Option<CreateIntentParams>,
    pub link_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct GetConsentMessageInput {
    pub intent_type: String,
    pub params: Option<CreateIntentParams>,
    pub link_id: String,
    pub intent_id: String,
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
    pub intent: IntentResp,
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
                _ => {}
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

pub struct TransactionUpdate {
    pub transaction_id: String,
    pub is_send: bool,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct UpdateIntentInput {
    pub link_id: String,
    pub intent_id: String,
    pub icrcx_responses: Option<IcrcxResponses>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ConfirmIntentInput {
    pub intent_id: String,
    pub link_id: String,
}
