// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    constant::ICP_CANISTER_PRINCIPAL,
    services::ext::{
        self,
        icrc_token::{Account as ExtAccount, Service},
    },
    utils::helper::to_subaccount,
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{common::Asset, link::v1::Link},
};
use futures::future;
use icrc_ledger_types::icrc1::account::Account;
use std::collections::HashMap;

/// Generates a unique account for a link using its ID and the canister's principal.
/// The account is derived by combining the canister's principal with a subaccount
/// generated from the link ID.
/// # Arguments
/// * `link_id` - The unique identifier of the link (UUID string).
/// * `canister_id` - The principal of the canister managing the link.
/// # Returns
/// * `Result<Account, CanisterError>` - The resulting account or an error if the conversion fails.
pub fn get_link_account(link_id: &str, canister_id: Principal) -> Result<Account, CanisterError> {
    Ok(Account {
        owner: canister_id,
        subaccount: Some(to_subaccount(link_id)?),
    })
}

/// Generates an external account representation for a link using its ID and the canister's principal.
/// This is used for interacting with external ICRC token services.
/// # Arguments
/// * `link_id` - The unique identifier of the link (UUID string).
/// * `canister_id` - The principal of the canister managing the link.
/// # Returns
/// * `Result<ext::icrc_token::Account, CanisterError>` - The resulting external account or an error if the conversion fails.
pub fn get_link_ext_account(
    link_id: &str,
    canister_id: Principal,
) -> Result<ext::icrc_token::Account, CanisterError> {
    let subaccount = to_subaccount(link_id)?;
    Ok(ext::icrc_token::Account {
        owner: canister_id,
        subaccount: Some(serde_bytes::ByteBuf::from(subaccount.to_vec())),
    })
}

/// Retrieves token fees for a link's assets, ensuring ICP is included.
/// # Arguments
/// * `link` - The Link for which to retrieve token fees
/// # Returns
/// * `Result<HashMap<Principal, Nat>, CanisterError>` - A mapping from token principal IDs (as strings)
///   to their corresponding transaction fees as Nat values, or an error if the operation failed
pub async fn get_batch_tokens_fee_for_link(
    link: &Link,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let mut assets: Vec<Asset> = link
        .asset_info
        .iter()
        .map(|info| info.asset.clone())
        .collect();

    // if ICP is missing in assets, add it
    if !assets.iter().any(|asset| match asset {
        Asset::IC { address, .. } => *address == ICP_CANISTER_PRINCIPAL,
    }) {
        let ic_asset = Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        };
        assets.push(ic_asset);
    }

    get_batch_tokens_fee(&assets).await
}

/// Retrieves token fees for a collection of assets in parallel.
/// # Arguments
/// * `assets` - A slice of Asset objects representing the tokens to query
/// # Returns
/// * `Result<HashMap<Principal, Nat>, CanisterError>` - A mapping from token principal IDs (as strings)
///   to their corresponding transaction fees as Nat values, or an error if the operation failed
pub async fn get_batch_tokens_fee(
    assets: &[Asset],
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let mut fee_map = HashMap::<Principal, Nat>::new();

    let get_fee_tasks = assets.iter().map(|asset| {
        let address = match asset {
            Asset::IC { address, .. } => *address,
        };
        async move { (address, Service::new(address).icrc_1_fee().await) }
    });

    let results = future::join_all(get_fee_tasks).await;

    for (address, result) in results {
        match result {
            Ok(fee) => {
                fee_map.insert(address, fee);
            }
            Err(errr) => {
                return Err(CanisterError::CallCanisterFailed(format!(
                    "Failed to get fee for asset {}: {:?}",
                    address.to_text(),
                    errr,
                )));
            }
        }
    }

    Ok(fee_map)
}

/// Retrieves token balances for a link's assets.
/// # Arguments
/// * `link` - The Link for which to retrieve token balances
/// * `canister_id` - The canister ID of the token contract.
/// # Returns
/// * `Result<HashMap<Principal, Nat>, CanisterError>` - A mapping from token principal IDs (as strings)
///   to their corresponding balances as Nat values, or an error if the operation failed
pub async fn get_batch_tokens_balance_for_link(
    link: &Link,
    canister_id: Principal,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let assets: Vec<Asset> = link
        .asset_info
        .iter()
        .map(|info| info.asset.clone())
        .collect();

    let link_account = get_link_ext_account(&link.id, canister_id)?;

    get_batch_tokens_balance(&assets, &link_account).await
}

/// Retrieves token balances for a collection of assets in parallel.
/// # Arguments
/// * `assets` - A slice of Asset objects representing the tokens to query
/// * `account` - The account for which to retrieve balances
/// # Returns
/// * `Result<HashMap<Principal, Nat>, CanisterError>` - A mapping from token principal IDs (as strings)
///   to their corresponding balances as Nat values, or an error if the operation failed
pub async fn get_batch_tokens_balance(
    assets: &[Asset],
    account: &ExtAccount,
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
                let service = Service::new(address);
                let balance_res = service.icrc_1_balance_of(&account).await;

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
            Err(errr) => {
                return Err(CanisterError::CallCanisterFailed(format!(
                    "Failed to get balance for asset {}: {:?}",
                    address.to_text(),
                    errr,
                )));
            }
        }
    }

    Ok(balance_map)
}
