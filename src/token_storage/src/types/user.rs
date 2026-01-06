// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;
use ic_mple_structures::Codec;
use std::collections::HashSet;
use token_storage_types::{TokenId, token::RegistryToken};

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
