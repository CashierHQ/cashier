use candid::CandidType;
use cashier_common::chain::Chain;
use cashier_macros::storable;
use ic_mple_structures::Codec;

#[storable]
#[derive(Clone, Eq, PartialEq, Debug, CandidType)]
pub struct UserPreference {
    pub hide_zero_balance: bool,
    pub hide_unknown_token: bool,
    pub selected_chain: Vec<Chain>,
}

#[storable]
pub enum UserPreferenceCodec {
    V1(UserPreference),
}

impl Codec<UserPreference> for UserPreferenceCodec {
    fn decode(source: Self) -> UserPreference {
        match source {
            UserPreferenceCodec::V1(link) => link,
        }
    }

    fn encode(dest: UserPreference) -> Self {
        UserPreferenceCodec::V1(dest)
    }
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
