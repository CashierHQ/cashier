use candid::CandidType;
use serde::{Deserialize, Serialize};

use crate::core::LinkType;

#[derive(Serialize, Deserialize, Debug, CandidType)]
pub struct CreateLinkInput {
    pub link_type: LinkType,
}
