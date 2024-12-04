use std::borrow::Cow;

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

use crate::types::action::{ActionStatus, ActionType};

const PK_PATTERN: &str = "action";

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Action {
    pub pk: String,
    pub status: ActionStatus,
    pub action_type: ActionType,
    pub link_id: String,
    pub creator_id: String,
}

impl Action {
    pub fn build_pk(id: String) -> String {
        format!("{}#{}", PK_PATTERN, id)
    }

    pub fn new(
        id: String,
        status: ActionStatus,
        action_type: ActionType,
        link_id: String,
        creator_id: String,
    ) -> Self {
        Self {
            pk: Self::build_pk(id),
            status,
            action_type,
            link_id,
            creator_id,
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
