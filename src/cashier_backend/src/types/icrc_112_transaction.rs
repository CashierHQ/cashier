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
    pub requests: Icrc112Requests,
}
impl Icrc112RequestsBuilder {
    pub fn new() -> Self {
        Self { requests: vec![] }
    }

    pub fn add_parallel_requests(&mut self, requests: ParallelRequests) -> usize {
        self.requests.push(requests);
        self.requests.len() - 1 // Return the index of the newly added group
    }

    pub fn add_one_request(&mut self, request: Icrc112Request) -> usize {
        self.requests.push(vec![request]);
        self.requests.len() - 1 // Return the index of the newly added group
    }

    pub fn add_to_first_group(&mut self, request: Icrc112Request) {
        if self.requests.is_empty() {
            self.requests.push(vec![]);
        }
        self.requests[0].push(request);
    }

    pub fn add_request_to_group(
        &mut self,
        group_index: usize,
        request: Icrc112Request,
    ) -> Result<(), String> {
        if group_index < self.requests.len() {
            self.requests[group_index].push(request);
            Ok(())
        } else {
            Err(format!("Group index {} out of bounds", group_index))
        }
    }

    pub fn build(self) -> Icrc112Requests {
        self.requests
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
