use crate::dto::{action::ActionDto, link::LinkDto};
use crate::repository::link::v1::Link;
use candid::CandidType;
use cashier_shared::types::Action as ActionShared;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkV3Input {
    pub title: String,
    pub action: ActionShared,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkV3Result {
    pub link: LinkDto,
    pub action: ActionShared,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateActionV3Input {
    pub link_id: String,
    pub action: ActionShared,
}
