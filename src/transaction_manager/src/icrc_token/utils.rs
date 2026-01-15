// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::icrc_token::{service::IcrcService, types::Account};
use candid::{Nat, Principal};
use cashier_backend_types::{error::CanisterError, repository::common::Asset};
use futures::future;
use std::collections::HashMap;

/// Retrieves token balances for a collection of assets in parallel.
pub async fn get_batch_tokens_balance(
    assets: &[Asset],
    account: &Account,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let mut balance_map = HashMap::new();
    let get_balance_tasks = assets
        .iter()
        .map(|asset| {
            let address = match asset {
                Asset::IC { address, .. } => *address,
            };
            let account = account.clone();
            async move {
                let service = IcrcService::new(address);
                // Convert ExtAccount to the service's Account type (same structure)
                let service_account = Account {
                    owner: account.owner,
                    subaccount: account.subaccount,
                };
                let balance_res = service.icrc_1_balance_of(&service_account).await;
                (address, balance_res)
            }
        })
        .collect::<Vec<_>>();

    let results = future::join_all(get_balance_tasks).await;

    for (address, result) in results {
        match result {
            Ok(balance) => {
                balance_map.insert(address, balance);
            }
            Err(err) => {
                return Err(CanisterError::CallCanisterFailed(format!(
                    "Failed to get balance for asset {}: {:?}",
                    address.to_text(),
                    err,
                )));
            }
        }
    }

    Ok(balance_map)
}
