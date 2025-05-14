use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, CandidType, Deserialize, Serialize)]
pub struct UserDto {
    pub id: String,
    pub email: Option<String>,
    pub wallet: String,
}
