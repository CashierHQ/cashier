use crate::{TokenId, token::RegistryToken};
use candid::CandidType;
use cashier_common::chain::Chain;
use cashier_macros::storable;
use ic_mple_structures::Codec;
use std::collections::HashSet;

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

#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct UserTokenList {
    // version only used for sync from registry to UserTokenList, do not use for other purpose
    pub version: u64,
    pub enable_list: HashSet<TokenId>,
}

#[storable]
pub enum UserTokenListCodec {
    V1(UserTokenList),
}

impl Codec<UserTokenList> for UserTokenListCodec {
    fn decode(source: Self) -> UserTokenList {
        match source {
            UserTokenListCodec::V1(link) => link,
        }
    }

    fn encode(dest: UserTokenList) -> Self {
        UserTokenListCodec::V1(dest)
    }
}

impl Default for UserTokenList {
    fn default() -> Self {
        Self {
            version: 1,
            enable_list: HashSet::new(),
        }
    }
}

impl UserTokenList {
    pub fn init_with_current_registry(
        &mut self,
        registry_tokens: Vec<RegistryToken>,
        version: u64,
    ) -> Result<(), String> {
        self.enable_list.clear();
        for token in registry_tokens {
            if token.enabled_by_default {
                self.enable_list.insert(token.details.token_id());
            }
        }
        self.version = version;
        Ok(())
    }
}
