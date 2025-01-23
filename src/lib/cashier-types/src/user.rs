use candid::CandidType;
use cashier_macros::storable;

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct User {
    pub id: String,
    pub email: Option<String>,
}

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct UserWallet {
    pub user_id: String,
}

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct UserLink {
    pub user_id: String,
    pub link_id: String,
}

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct UserAction {
    pub user_id: String,
    pub action_id: String,
}
