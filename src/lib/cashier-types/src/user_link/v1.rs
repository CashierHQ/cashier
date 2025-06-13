use candid::CandidType;
use cashier_macros::storable;

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct UserLink {
    pub user_id: String,
    pub link_id: String,
}
