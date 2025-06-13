use candid::CandidType;
use cashier_macros::storable;

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct UserAction {
    pub user_id: String,
    pub action_id: String,
}
