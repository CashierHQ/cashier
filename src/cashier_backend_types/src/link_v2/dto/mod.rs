use crate::dto::{action::ActionDto, link::LinkDto};
use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct CreateLinkDto {
    pub link: LinkDto,
    pub action: ActionDto,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ProcessActionDto {
    pub link: LinkDto,
    pub action: ActionDto,
    pub is_success: bool,
    pub errors: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ProcessActionV2Input {
    pub action_id: String,
}
