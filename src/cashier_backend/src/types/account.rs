use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

pub type Subaccount = serde_bytes::ByteBuf;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Subaccount>,
}
