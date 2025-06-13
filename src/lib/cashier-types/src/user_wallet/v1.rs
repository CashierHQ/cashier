use candid::CandidType;
use cashier_macros::storable;

#[derive(Clone, Debug, Default, CandidType, PartialEq)]
#[storable]
pub struct UserWallet {
    pub user_id: String,
}
