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

    pub fn from_persistence(user: crate::store::entities::user::User) -> Self {
        let id = user.pk.split('#').last().unwrap().to_string();
        Self {
            id,
            email: user.email,
            wallet: user.wallet,
        }
    }

    pub fn to_persistence(&self) -> crate::store::entities::user::User {
        crate::store::entities::user::User::new(
            self.id.clone(),
            self.email.clone(),
            self.wallet.clone(),
        )
    }
}
