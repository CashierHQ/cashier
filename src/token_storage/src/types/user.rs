// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;
use std::collections::HashSet;

use super::chain::Chain;
use super::common::TokenId;
use super::token::RegistryToken;

// User preferences (mostly unchanged)
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

#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct UserTokenList {
    // version only used for sync from registry to UserTokenList, do not use for other purpose
    pub version: u64,
    pub enable_list: HashSet<TokenId>,
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
            self.enable_list.insert(token.id.clone());
        }
        self.version = version;
        Ok(())
    }
}
