// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::bitcoin::traits::CkBtcMinterTrait;
use candid::Principal;
use ic_cdk::call::{Call, CandidDecodeFailed};
use token_storage_types::{bitcoin::ckbtc_minter::GetBtcAddressArg, error::CanisterError};

pub struct IcCkBtcMinterClient;

impl CkBtcMinterTrait for IcCkBtcMinterClient {
    async fn get_btc_address(
        &self,
        user: Principal,
        ckbtc_minter: Principal,
    ) -> Result<String, CanisterError> {
        let arg = GetBtcAddressArg {
            owner: Some(user),
            subaccount: None,
        };
        let response = Call::bounded_wait(ckbtc_minter, "get_btc_address")
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
        async fn get_btc_address(
            &self,
            user: Principal,
            _ckbtc_minter: Principal,
        ) -> Result<String, CanisterError> {
            match self.address_map.get(&user) {
                Some(address) => Ok(address.clone()),
                None => Err(CanisterError::not_found("CKBTC address", &user.to_string())),
            }
        }
    }
}
