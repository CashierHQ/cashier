// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    constant::{FEE_TREASURY_PRINCIPAL, ICP_CANISTER_PRINCIPAL},
    services::ext::{
        self,
        icrc_token::{
            Account as ExtAccount, Allowance, AllowanceArgs, Service, TransferArg, TransferFromArgs,
        },
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

/// Retrieves the creator's external account representation for a given link.
/// This account is used for interactions with external ICRC token services.
/// # Arguments
/// * `link` - The link for which to retrieve the creator's account.
/// # Returns
/// * `ext::icrc_token::Account` - The resulting external account of the link creator.
pub fn get_link_creator_ext_account(link: &Link) -> ext::icrc_token::Account {
    ext::icrc_token::Account {
        owner: link.creator,
        subaccount: None,
    }
}

/// Retrieves the canister's external account representation.
/// This account is used for interactions with external ICRC token services.
/// # Arguments
/// * `canister_id` - The principal of the canister.
/// # Returns
/// * `ext::icrc_token::Account` - The resulting external account of the canister.
pub fn get_canister_ext_account(canister_id: Principal) -> ext::icrc_token::Account {
    ext::icrc_token::Account {
        owner: canister_id,
        subaccount: None,
    }
}

/// Retrieves the treasury's external account representation.
/// This account is used for interactions with external ICRC token services.
/// # Returns
/// * `ext::icrc_token::Account` - The resulting external account of the treasury
pub fn get_treasury_ext_account() -> ext::icrc_token::Account {
    get_canister_ext_account(FEE_TREASURY_PRINCIPAL)
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

/// Retrieves token allowances for a collection of assets in parallel.
/// # Arguments
/// * `assets` - A slice of Asset objects representing the tokens to query
/// * `owner` - The account owning the tokens
/// * `spender` - The account authorized to spend the tokens
/// # Returns
/// * `Result<HashMap<Principal, Nat>, CanisterError>` - A mapping from token principal IDs (as strings)
///   to their corresponding allowances as Nat values, or an error if the operation failed
pub async fn get_batch_tokens_allowance(
    assets: &[Asset],
    owner: &ExtAccount,
    spender: &ExtAccount,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let mut allowance_map = HashMap::new();
    let get_allowance_tasks = assets
        .iter()
        .map(|asset| {
            let address = match asset {
                Asset::IC { address, .. } => *address,
            };
            let owner = owner.clone();
            let spender = spender.clone();
            async move {
                let service = Service::new(address);
                let allowance_args = AllowanceArgs {
                    account: owner,
                    spender,
                };
                let allowance_res = service.icrc_2_allowance(&allowance_args).await;

                (address, allowance_res)
            }
        })
        .collect::<Vec<_>>();

    let results = future::join_all(get_allowance_tasks).await;

    for (address, result) in results {
        match result {
            Ok(allowance) => {
                allowance_map.insert(address, allowance.allowance);
            }
            Err(errr) => {
                return Err(CanisterError::CallCanisterFailed(format!(
                    "Failed to get allowance for asset {}: {:?}",
                    address.to_text(),
                    errr,
                )));
            }
        }
    }

    Ok(allowance_map)
}

/// Transfers a specified fee amount from the link creator's account to the treasury account.
/// This function constructs a transfer request and invokes the transfer operation on the ICP token service.
/// # Arguments
/// * `link` - The link associated with the transfer, used to identify the creator's account.
/// * `fee_amount` - The amount of fee to be transferred.
/// * `icp_token_fee` - The transaction fee for the ICP token transfer.
/// # Returns
/// * `Result<block_id: Nat, CanisterError>` - The block ID of the transfer transaction if successful, or an error if the transfer fails.
pub async fn transfer_fee_from_link_creator_to_treasury(
    link: &Link,
    fee_amount: Nat,
    icp_token_fee: Nat,
) -> Result<Nat, CanisterError> {
    let link_creator_ext_account = get_link_creator_ext_account(link);
    let treasury_ext_account = get_treasury_ext_account();

    let transfer_arg = TransferFromArgs {
        from: link_creator_ext_account,
        to: treasury_ext_account,
        amount: fee_amount,
        fee: Some(icp_token_fee),
        spender_subaccount: None,
        memo: None,
        created_at_time: None,
    };

    let token_service = Service::new(ICP_CANISTER_PRINCIPAL);
    let result = token_service.icrc_2_transfer_from(&transfer_arg).await?;
    let block_id = result.map_err(|e| {
        CanisterError::CallCanisterFailed(format!(
            "Failed to transfer fee from link creator to treasury: {:?}",
            e
        ))
    })?;

    Ok(block_id)
}

pub async fn transfer_token_from_link_to_account(
    link_id: &str,
    canister_id: Principal,
    assets: &[Asset],
    to: &ExtAccount,
    amount: Nat,
    fee: Nat,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let from_account = get_link_ext_account(link_id, canister_id)?;

    let transfer_tasks = assets
        .iter()
        .map(|asset| {
            let from_account = from_account.clone();
            let to = to.clone();
            let amount = amount.clone();
            let fee = fee.clone();
            async move {
                let transfer_arg = TransferArg {
                    from_subaccount: from_account.subaccount,
                    to: to.clone(),
                    amount,
                    fee: Some(fee),
                    memo: None,            // TODO
                    created_at_time: None, // TODO
                };

                let address = match asset {
                    Asset::IC { address, .. } => *address,
                };
                let token_service = Service::new(address);
                let result = token_service.icrc_1_transfer(&transfer_arg).await;
                (address, result)
            }
        })
        .collect::<Vec<_>>();

    let transfer_results = future::join_all(transfer_tasks).await;
    let mut transfer_map = HashMap::new();
    for (address, result) in transfer_results {
        match result {
            Ok(block_id) => {
                let block_id = block_id.map_err(|e| {
                    CanisterError::CallCanisterFailed(format!(
                        "Failed to transfer token for asset {}: {:?}",
                        address.to_text(),
                        e
                    ))
                })?;
                transfer_map.insert(address, block_id);
            }
            Err(errr) => {
                return Err(CanisterError::CallCanisterFailed(format!(
                    "Failed to transfer token for asset {}: {:?}",
                    address.to_text(),
                    errr,
                )));
            }
        }
    }

    Ok(transfer_map)
}
