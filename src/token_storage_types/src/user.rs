use candid::CandidType;
use cashier_common::chain::Chain;
use cashier_macros::storable;

#[storable]
#[derive(Clone, Eq, PartialEq, Debug, CandidType)]
pub struct UserPreference {
    pub hide_zero_balance: bool,
    pub hide_unknown_token: bool,
    pub selected_chain: Vec<Chain>,
}

impl Default for UserPreference {
    fn default() -> Self {
        Self {
            hide_zero_balance: false,
            hide_unknown_token: false,
            selected_chain: vec![Chain::IC],
        }
    }
}
