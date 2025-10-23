use crate::{
    dto::action::{ActionDto, Icrc112Requests, IntentDto},
    repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CreateActionResult {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
}

impl From<CreateActionResult> for ActionDto {
    fn from(create_action_result: CreateActionResult) -> Self {
        ActionDto {
            id: create_action_result.action.id,
            r#type: create_action_result.action.r#type,
            state: create_action_result.action.state,
            creator: create_action_result.action.creator,
            intents: create_action_result
                .intents
                .into_iter()
                .map(IntentDto::from)
                .collect(),
            icrc_112_requests: create_action_result.icrc112_requests,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ProcessActionResult {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
}

impl From<ProcessActionResult> for ActionDto {
    fn from(process_action_result: ProcessActionResult) -> Self {
        ActionDto {
            id: process_action_result.action.id,
            r#type: process_action_result.action.r#type,
            state: process_action_result.action.state,
            creator: process_action_result.action.creator,
            intents: process_action_result
                .intents
                .into_iter()
                .map(IntentDto::from)
                .collect(),
            icrc_112_requests: None,
        }
    }
}
