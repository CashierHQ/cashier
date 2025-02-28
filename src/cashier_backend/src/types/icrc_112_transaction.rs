use std::collections::HashMap;

use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Icrc112Request {
    pub canister_id: String,
    pub method: String,
    pub arg: String,
    pub nonce: Option<String>,
}

pub type ParallelRequests = Vec<Icrc112Request>;

pub type SequenceRequest = Vec<ParallelRequests>;

pub type Icrc112Requests = SequenceRequest;

pub trait Icrc112RequestsExt {
    fn len(&self) -> usize;
}

impl Icrc112RequestsExt for Icrc112Requests {
    fn len(&self) -> usize {
        self.iter().fold(0, |acc, x| acc + x.len())
    }
}

pub struct Icrc112RequestsBuilder {
    pub requests: HashMap<usize, Vec<Icrc112Request>>,
    pub request_ids: HashMap<usize, Vec<String>>,
}

impl Icrc112RequestsBuilder {
    pub fn new() -> Self {
        Self {
            requests: HashMap::new(),
            request_ids: HashMap::new(),
        }
    }

    pub fn count_requests(&self) -> usize {
        self.requests.len()
    }

    pub fn add_request_to_group(
        &mut self,
        group_index: usize,
        request_id: String,
        icrc_112_request: Icrc112Request,
    ) {
        match self.request_ids.get_mut(&group_index) {
            Some(group) => {
                group.push(request_id);
            }
            None => {
                self.request_ids.insert(group_index, vec![request_id]);
            }
        }

        match self.requests.get_mut(&group_index) {
            Some(group) => {
                group.push(icrc_112_request);
            }
            None => {
                self.requests.insert(group_index, vec![icrc_112_request]);
            }
        }
    }

    pub fn build(self) -> Icrc112Requests {
        let mut sorted_requests: Vec<(usize, Vec<Icrc112Request>)> =
            self.requests.into_iter().collect();
        sorted_requests.sort_by_key(|&(key, _)| key);

        sorted_requests
            .into_iter()
            .map(|(_, requests)| requests)
            .collect()
    }
}
#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CanisterCallResponse {
    pub content_map: String,
    pub certificate: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct SuccessResponse {
    pub result: CanisterCallResponse,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ErrorDetail {
    pub code: i32,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum IcrcXResponseItem {
    Success(SuccessResponse),
    Error(ErrorResponse),
}

pub type IcrcxResponses = Vec<Vec<IcrcXResponseItem>>;
