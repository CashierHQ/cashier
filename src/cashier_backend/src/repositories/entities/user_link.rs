use candid::CandidType;
use cashier_essentials::storable;

pub const KEY_PATTERN: &str = "user#{}#link#{}";

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct UserLink {
    pub pk: String,
    pub created_at: u64,
}

impl UserLink {
    pub fn build_pk(user_id: String, link_id: String) -> String {
        format!("user#{}#link#{}", user_id, link_id)
    }

    pub fn split_pk(&self) -> (String, String) {
        let parts: Vec<&str> = self.pk.split('#').collect();
        let user_id = parts.get(1).unwrap_or(&"").to_string();
        let link_id = parts.get(3).unwrap_or(&"").to_string();
        (user_id, link_id)
    }

    pub fn new(user_id: String, link_id: String, ts: u64) -> Self {
        Self {
            pk: Self::build_pk(user_id.clone(), link_id.clone()),
            created_at: ts,
        }
    }
}
