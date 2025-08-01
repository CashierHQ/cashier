// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
    fn is_empty(&self) -> bool;
}

impl Icrc112RequestsExt for Icrc112Requests {
    fn len(&self) -> usize {
        self.iter().fold(0, |acc, x| acc + x.len())
    }

    fn is_empty(&self) -> bool {
        self.len() == 0
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
