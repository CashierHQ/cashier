use crate::dto::{action::ActionDto, link::LinkDto};
use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct LinkActionDto {
    pub link: LinkDto,
    pub action: ActionDto,
}
