// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::ext::icrc_token::Service;
use candid::{Nat, Principal};
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::common::{Asset, Chain};
use futures::future::{self, BoxFuture};
use std::collections::HashMap;
use std::str::FromStr;

// Define a type alias for the boxed future that returns Principal and CallResult
type GetFeeTaskResponse = BoxFuture<'static, (Principal, Result<candid::Nat, CanisterError>)>;

/// Service for retrieving token fees in batch operations
pub struct IcrcBatchService;

impl IcrcBatchService {
    /// Creates a new instance of IcrcBatchService
    pub fn new() -> Self {
        Self
    }

    /// Retrieves token fees for a collection of assets in parallel.
    ///
    /// This function fetches the transaction fees for all IC tokens provided in the assets list.
    /// It makes parallel calls to each token's canister to optimize performance when fetching
    /// multiple token fees simultaneously.
    ///
    /// # Arguments
    ///
    /// * `assets` - A vector of Asset objects representing the tokens to query
    ///
    /// # Returns
    ///
    /// * `Result<HashMap<String, Nat>, CanisterError>` - A mapping from token principal IDs (as strings)
    ///   to their corresponding transaction fees as Nat values, or an error if the operation failed
    ///
    /// # Errors
    ///
    /// This function will return an error in the following situations:
    /// * If any of the assets are not IC chain assets
    /// * If any asset address cannot be parsed into a valid Principal
    /// * If any of the fee queries to token canisters fail
    ///
    /// # Example
    ///
    /// ```
    /// let service = IcrcBatchService::new();
    /// let assets = vec![
    ///     Asset { address: "ryjl3-tyaaa-aaaaa-aaaba-cai", chain: Chain::IC },
    ///     Asset { address: "utozz-siaaa-aaaam-qaaxq-cai", chain: Chain::IC }
    /// ];
    /// let token_fees = service.get_batch_tokens_fee(&assets).await?;
    /// ```
    pub async fn get_batch_tokens_fee(
        &self,
        assets: &Vec<Asset>,
    ) -> Result<HashMap<String, Nat>, CanisterError> {
        // right now make sure all token is IC assets
        let is_all_ic_assets = assets.iter().all(|asset| asset.chain == Chain::IC);

        if !is_all_ic_assets {
            return Err(CanisterError::ValidationErrors(
                "All assets must be IC assets".to_string(),
            ));
        }

        // Create a vector to store the principal and corresponding fee call future
        let mut get_fee_calls: Vec<GetFeeTaskResponse> = Vec::new();

        // Create a HashMap to store the final results
        let mut fee_map: HashMap<String, Nat> = HashMap::new();

        for asset in assets {
            // Parse the asset address to Principal
            match Principal::from_str(&asset.address) {
                Ok(principal) => {
                    // Create a boxed async closure that returns a Future
                    get_fee_calls.push(Box::pin(async move {
                        let service = Service::new(principal);
                        let fee_res = service.icrc_1_fee().await;

                        (principal, fee_res)
                    }));
                }
                // If address is invalid, return an error, stop processing further
                Err(_) => {
                    return Err(CanisterError::ValidationErrors(format!(
                        "Invalid asset address: {}",
                        asset.address
                    )));
                }
            }
        }

        // Execute all calls in parallel, but we need to keep track of which result belongs to which principal
        let results = future::join_all(get_fee_calls).await; // wait for all calls

        // Process results
        for (principal, result) in results {
            match result {
                Ok(fee) => {
                    // If call succeeds, convert fee to Nat and add to the HashMap
                    let fee_n = fee;
                    fee_map.insert(principal.to_text(), fee_n);
                }
                Err(errr) => {
                    return Err(CanisterError::CallCanisterFailed(format!(
                        "Failed to get fee for asset {}: {:?}",
                        principal.to_text(),
                        errr,
                    )));
                }
            }
        }

        Ok(fee_map)
    }
}

impl Default for IcrcBatchService {
    fn default() -> Self {
        Self::new()
    }
}
