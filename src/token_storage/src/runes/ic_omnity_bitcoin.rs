// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_cdk::call::{Call, CandidDecodeFailed};
use token_storage_types::{bitcoin::omnity_bitcoin::GetBtcAddressArgs, error::CanisterError};

use crate::runes::traits::OmnityBitcoinTrait;

pub struct IcOmnityBitcoin;

impl OmnityBitcoinTrait for IcOmnityBitcoin {
    /// Get the BTC address for a given receiver from the Omnity Bitcoin canister.
    /// # Arguments
    /// * `omnity_bitcoin` - The Omnity Bitcoin canister id
    /// * `args` - The Omnity address lookup arguments
    /// # Returns
    /// * `Ok(String)` containing the BTC address if successful
    /// * `Err(CanisterError)` if there is an error
    async fn get_btc_address(
        &self,
        omnity_bitcoin: Principal,
        args: GetBtcAddressArgs,
    ) -> Result<String, CanisterError> {
        let response = Call::bounded_wait(omnity_bitcoin, "get_btc_address")
            .with_arg(args)
            .await
            .map_err(CanisterError::from)?;

        let parsed_res: Result<String, CandidDecodeFailed> = response.candid();
        parsed_res.map_err(CanisterError::from)
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::{cell::RefCell, collections::HashMap};

    pub struct MockOmnityBitcoin {
        pub address_map: HashMap<String, String>,
        pub error: Option<CanisterError>,
        pub call_args: RefCell<Vec<GetBtcAddressArgs>>,
    }

    impl MockOmnityBitcoin {
        pub fn new() -> Self {
            Self {
                address_map: HashMap::new(),
                error: None,
                call_args: RefCell::new(vec![]),
            }
        }

        /// Set the Rune deposit address for a receiver.
        /// # Arguments
        /// * `receiver` - The receiver identifier
        /// * `address` - The BTC deposit address to set
        pub fn set_btc_address(&mut self, receiver: &str, address: &str) {
            self.address_map
                .insert(receiver.to_string(), address.to_string());
        }

        /// Set the error returned by the mock.
        /// # Arguments
        /// * `error` - The error to return on address lookup
        pub fn set_error(&mut self, error: CanisterError) {
            self.error = Some(error);
        }
    }

    impl OmnityBitcoinTrait for MockOmnityBitcoin {
        async fn get_btc_address(
            &self,
            _omnity_bitcoin: Principal,
            args: GetBtcAddressArgs,
        ) -> Result<String, CanisterError> {
            self.call_args.borrow_mut().push(args.clone());

            if let Some(error) = &self.error {
                return Err(error.clone());
            }

            match self.address_map.get(&args.receiver) {
                Some(address) => Ok(address.clone()),
                None => Err(CanisterError::not_found("Rune address", &args.receiver)),
            }
        }
    }
}
