use candid::CandidType;
use cashier_shared::types::{
    Action as ActionShared, Link as LinkShared, LinkType as LinkTypeShared,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkInputV3 {
    pub title: String,
    pub link_type: LinkTypeShared,
    pub action: ActionShared,
    pub max_use_count: u64,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkResponseV3 {
    pub link: LinkShared,
    pub action: ActionShared,
}
