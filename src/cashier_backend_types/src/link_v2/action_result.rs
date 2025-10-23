use crate::{
    dto::action::{ActionDto, Icrc112Requests, IntentDto, TransactionDto},
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
        let intents_dto: Vec<IntentDto> = create_action_result
            .intents
            .into_iter()
            .map(|intent| {
                // let transactions = intent_hashmap.get(&intent.id).unwrap();
                let intent_id = intent.id.clone();
                let mut intent_dto = IntentDto::from(intent);
                let txs = create_action_result
                    .intent_txs_map
                    .get(&intent_id)
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .map(TransactionDto::from)
                    .collect();

                intent_dto.transactions = txs;
                intent_dto
            })
            .collect();

        ActionDto {
            id: create_action_result.action.id,
            r#type: create_action_result.action.r#type,
            state: create_action_result.action.state,
            creator: create_action_result.action.creator,
            intents: intents_dto,
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
