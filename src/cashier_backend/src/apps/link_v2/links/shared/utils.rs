// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{common::Asset, link::v1::Link},
};
use cashier_common::{constant::ICP_CANISTER_PRINCIPAL, utils::to_subaccount};
use cashier_common::runtime::RealIcEnvironment;
use serde_bytes::ByteBuf;
use std::collections::HashMap;
use transaction_manager::icrc_token::{types::Account, utils::get_batch_tokens_balance};
use transaction_manager::token_fee::{IcrcTokenFetcher, TokenFeeService};

/// Retrieves token fees for a link's assets, ensuring ICP is included.
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
        assets.push(Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        });
    }

    // Use TokenFeeService directly (with caching)
    let service = TokenFeeService::new(RealIcEnvironment::new(), IcrcTokenFetcher::new());
    service.get_batch_tokens_fee(&assets).await
}

/// Retrieves token balances for a link's assets.
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
        subaccount: Some(
            ByteBuf::from(subaccount.to_vec()),
        ),
    };

    get_batch_tokens_balance(&assets, &link_account).await
}
