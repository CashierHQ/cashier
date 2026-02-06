use crate::{dto::action::Icrc112Requests, repository::transaction::v1::Transaction};
use candid::CandidType;
use cashier_shared::types::{
    Action as ActionShared, Link as LinkShared, LinkType as LinkTypeShared,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionInputV3 {
    pub link_id: String,
    pub action: ActionShared,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionResponseV3 {
    pub link: LinkShared,
    pub action: ActionShared,
    pub icrc112_requests: Option<Icrc112Requests>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ProcessActionInputV3 {
    pub link_id: String,
    pub action_id: String,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ProcessActionResponseV3 {
    pub link: LinkShared,
    pub action: ActionShared,
    pub icrc112_requests: Option<Icrc112Requests>,
    pub is_success: bool,
    pub errors: Vec<String>,
}
