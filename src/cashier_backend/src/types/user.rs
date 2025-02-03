use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, CandidType, Deserialize, Serialize)]
pub struct User {
    pub id: String,
    pub email: Option<String>,
    pub wallet: String,
}

impl User {
    pub fn new(id: String, email: Option<String>, wallet: String) -> Self {
        Self { id, email, wallet }
    }
}
