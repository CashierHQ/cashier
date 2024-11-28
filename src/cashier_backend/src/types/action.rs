use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Status {
    Created,
    Processing,
    Success,
    Failed,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ClaimActionParams {
    address: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum CreateActionParams {
    Claim(ClaimActionParams),
    None,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]

pub enum ActionType {
    Create,
    Withdraw,
    Claim,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionInput {
    action_type: ActionType,
    params: CreateActionParams,
    link_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Action {
    pub id: String,
    pub status: Status,
    pub action_type: ActionType,
    pub link_id: String,
}

impl Action {
    pub fn from_input(id: String, input: CreateActionInput) -> Self {
        Self {
            id: id,
            status: Status::Created,
            action_type: input.action_type,
            link_id: input.link_id,
        }
    }
}

impl Storable for Action {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}
