// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    constant::{
        INTENT_LABEL_RECEIVE_PAYMENT_ASSET, INTENT_LABEL_SEND_AIRDROP_ASSET,
        INTENT_LABEL_SEND_TIP_ASSET, INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
    },
    error::CanisterError,
    repository::{
        common::Asset,
        link::v1::{Link, LinkType},
    },
};
use cashier_common::{constant::ICP_CANISTER_PRINCIPAL, utils::to_subaccount};
use futures::future;
use serde_bytes::ByteBuf;
use std::collections::HashMap;
use token_storage_types::token::IcrcStandard;
use transaction_manager::icrc_token::{service::IcrcService, types::Account};

use crate::{
    api::state::get_state,
    apps::{token_fee::traits::TokenFeeCache, token_standard::traits::TokenStandardCache},
};

/// Retrieves token fees for a link's assets, ensuring ICP is included.
/// # Arguments
///
/// * `link` - A reference to the link whose asset fees should be retrieved
/// # Returns
///
/// Returns a `HashMap` mapping each asset's `Principal` to its fee as a `Nat`.
/// The returned map will always include ICP's fee.
///
/// # Errors
///
/// Returns a `CanisterError` if:
/// * The fee service fails to retrieve fees for any asset
/// * Network calls to token canisters fail
///
pub async fn get_batch_tokens_fee_for_link(
    link: &Link,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let asset_principals = link_asset_principals(link);
    // Use TokenFeeService from CanisterState (with caching)
    let mut state = get_state();
    state
        .token_fee_service
        .get_batch_tokens_fee(&asset_principals)
        .await
}

/// Retrieves token balances for a collection of assets in parallel.
///
/// This helper function queries multiple token canisters concurrently to fetch
/// balances for the specified account. All balance queries are executed in parallel
/// using `future::join_all` for optimal performance.
///
/// # Arguments
///
/// * `assets` - Slice of assets to query balances for
/// * `account` - The ICRC account (owner + subaccount) to check balances for
///
/// # Returns
///
/// Returns a `HashMap` mapping each token's `Principal` to its balance as a `Nat`.
///
/// # Errors
///
/// Returns a `CanisterError` if:
/// * Any token canister fails to respond
/// * The ICRC-1 balance query returns an error
/// * Network or inter-canister communication fails
async fn get_batch_tokens_balance(
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

/// Retrieves token balances for a link's assets from their respective token canisters.
///
/// This function extracts all assets from the link's `asset_info`, derives the link's
/// subaccount from its ID, and queries the balance for each asset at that account.
///
/// # Arguments
///
/// * `link` - A reference to the link whose asset balances should be retrieved
/// * `canister_id` - The principal of the canister that owns the link account
///
/// # Returns
///
/// Returns a `HashMap` mapping each asset's `Principal` to its current balance as a `Nat`.
///
/// # Errors
///
/// Returns a `CanisterError` if:
/// * Subaccount derivation from the link ID fails
/// * Network calls to token canisters fail
/// * Any token canister query returns an error
pub async fn get_batch_tokens_balance_for_link(
    link: &Link,
    canister_id: Principal,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let assets: Vec<Asset> = link
        .asset_info
        .iter()
        .map(|info| info.asset.clone())
        .collect();

    let subaccount = to_subaccount(&link.id)?;

    let link_account = Account {
        owner: canister_id,
        subaccount: Some(ByteBuf::from(subaccount.to_vec())),
    };

    get_batch_tokens_balance(&assets, &link_account).await
}

/// Retrieves token standards for a link's assets from the TokenStandardService.
/// # Arguments
/// * `link` - The link to retrieve token standards for
/// # Returns
/// * `HashMap<Principal, Vec<IcrcStandard>>` - A map of token principals to their respective standards
pub async fn get_batch_token_standards_for_link(
    link: &Link,
) -> Result<HashMap<Principal, Vec<IcrcStandard>>, CanisterError> {
    let mut state = get_state();
    let token_principals: Vec<Principal> = link_assets(link)
        .iter()
        .map(|asset| match asset {
            Asset::IC { address, .. } => *address,
        })
        .collect();

    state
        .token_standard_service
        .get_batch_token_standards(&token_principals)
        .await
}

/// Extracts assets from link
/// # Arguments
/// * `link` - The link to extract assets from
/// # Returns
/// * `Vec<Asset>` - The list of assets in the link, including ICP if
pub fn link_assets(link: &Link) -> Vec<Asset> {
    let mut assets: Vec<Asset> = link
        .asset_info
        .iter()
        .map(|info| info.asset.clone())
        .collect();

    // if ICP is missing in assets, add it
    if !assets.iter().any(|asset| match asset {
        Asset::IC { address, .. } => *address == ICP_CANISTER_PRINCIPAL,
    }) {
        assets.push(Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        });
    }

    assets
}

/// Extracts the principals of assets from a link
/// # Arguments
/// * `link` - The link to extract asset principals from
/// # Returns
/// * `Vec<Principal>` - The list of asset principals in the link, including ICP if missing
pub fn link_asset_principals(link: &Link) -> Vec<Principal> {
    let assets = link_assets(link);
    assets
        .iter()
        .map(|asset| match asset {
            Asset::IC { address, .. } => *address,
        })
        .collect()
}

/// Generate the label for an intent based on the link type and asset
/// # Arguments
/// * `link_type` - The type of the link (e.g. SendTip,
/// SendAirdrop, SendTokenBasket, ReceivePayment)
/// * `asset` - The asset associated with the intent
/// # Returns
/// * `String` - The generated intent label in the format of "{INTENT_LABEL}_{ASSET_PRINCIPAL}"
pub fn generate_intent_asset_label(link_type: LinkType, asset: &Asset) -> String {
    let asset_address = match asset {
        Asset::IC { address } => address,
    };

    match link_type {
        LinkType::SendTip => format!(
            "{}_{}",
            INTENT_LABEL_SEND_TIP_ASSET,
            asset_address.to_text()
        ),
        LinkType::SendAirdrop => format!(
            "{}_{}",
            INTENT_LABEL_SEND_AIRDROP_ASSET,
            asset_address.to_text()
        ),
        LinkType::SendTokenBasket => format!(
            "{}_{}",
            INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
            asset_address.to_text()
        ),
        LinkType::ReceivePayment => format!(
            "{}_{}",
            INTENT_LABEL_RECEIVE_PAYMENT_ASSET,
            asset_address.to_text()
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn it_should_generate_intent_asset_label() {
        // Arrange
        let ledger_id = random_principal_id();
        let asset = Asset::IC { address: ledger_id };
        let link_types = vec![
            LinkType::SendTip,
            LinkType::SendAirdrop,
            LinkType::SendTokenBasket,
            LinkType::ReceivePayment,
        ];

        // Act & Assert
        for link_type in link_types {
            let label = generate_intent_asset_label(link_type, &asset);
            let expected_prefix = match link_type {
                LinkType::SendTip => INTENT_LABEL_SEND_TIP_ASSET,
                LinkType::SendAirdrop => INTENT_LABEL_SEND_AIRDROP_ASSET,
                LinkType::SendTokenBasket => INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                LinkType::ReceivePayment => INTENT_LABEL_RECEIVE_PAYMENT_ASSET,
            };
            let expected_label = format!("{}_{}", expected_prefix, ledger_id.to_text());
            assert_eq!(label, expected_label);
        }
    }
}
