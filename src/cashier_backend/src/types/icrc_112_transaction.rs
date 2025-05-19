// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
