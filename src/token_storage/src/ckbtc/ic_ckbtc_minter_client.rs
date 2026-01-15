// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::ckbtc::traits::CkBtcMinterTrait;
use candid::Principal;
use ic_cdk::call::{Call, CandidDecodeFailed};
use token_storage_types::{bitcoin::ckbtc_minter::GetBtcAddressArg, error::CanisterError};

pub struct IcCkBtcMinterClient {
    pub ckbtc_minter_canister_id: Principal,
}

impl IcCkBtcMinterClient {
    pub fn new(ckbtc_minter_canister_id: Principal) -> Self {
        Self {
            ckbtc_minter_canister_id,
        }
    }
}

impl CkBtcMinterTrait for IcCkBtcMinterClient {
    fn set_canister_id(&mut self, canister_id: Principal) {
        self.ckbtc_minter_canister_id = canister_id;
    }

    async fn get_btc_address(&self, user: Principal) -> Result<String, CanisterError> {
        let arg = GetBtcAddressArg {
            owner: Some(user),
            subaccount: None,
        };
        let response = Call::bounded_wait(self.ckbtc_minter_canister_id, "get_btc_address")
            .with_arg(arg)
            .await
            .map_err(CanisterError::from)?;

        let parsed_res: Result<String, CandidDecodeFailed> = response.candid();
        parsed_res.map_err(CanisterError::from)
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::collections::HashMap;

    pub struct MockCkBtcMinterClient {
        pub address_map: HashMap<Principal, String>,
    }

    impl MockCkBtcMinterClient {
        pub fn new() -> Self {
            Self {
                address_map: HashMap::new(),
            }
        }

        /// Sets the BTC address for a given user
        /// # Arguments
        /// * `user` - The principal ID of the user
        /// * `address` - The BTC address to set
        pub fn set_btc_address(&mut self, user: Principal, address: String) {
            self.address_map.insert(user, address);
        }
    }

    impl CkBtcMinterTrait for MockCkBtcMinterClient {
        fn set_canister_id(&mut self, _canister_id: Principal) {
            // No-op for mock
        }

        async fn get_btc_address(&self, user: Principal) -> Result<String, CanisterError> {
            match self.address_map.get(&user) {
                Some(address) => Ok(address.clone()),
                None => Err(CanisterError::not_found("CKBTC address", &user.to_string())),
            }
        }
    }
}
