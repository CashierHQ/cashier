// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::{
        INTENT_LABEL_RECEIVE_PAYMENT_ASSET, INTENT_LABEL_SEND_AIRDROP_ASSET,
        INTENT_LABEL_SEND_TIP_ASSET, INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
    },
    error::CanisterError,
    repository::{
        asset::{
            v1::Asset,
            v3::{AssetV3, TokenStandardV3},
        },
        link::{
            v1::{Link, LinkType},
            v3::LinkV3,
        },
    },
};
use cashier_common::constant::ICP_CANISTER_PRINCIPAL;

pub async fn get_batch_tokens_fee_for_link_v3(
    link: &LinkV3,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let mut assets: Vec<AssetV3> = link
        .asset_info
        .iter()
        .map(|info| info.asset.clone())
        .collect();

    // if ICP is missing in assets, add it
    if !assets
        .iter()
        .any(|asset| asset.address == ICP_CANISTER_PRINCIPAL)
    {
        assets.push(AssetV3 {
            address: ICP_CANISTER_PRINCIPAL,
            network_fee: None,
            token_standard: TokenStandardV3::ICRC2,
        });
    }

    // Use TokenFeeService from CanisterState (with caching)
    let mut state = get_state();
    state
        .token_fee_service
        .get_batch_tokens_fee_v3(&assets)
        .await;

    Ok(balance_map)
}

async fn get_batch_tokens_balance_v3(
    assets: &[AssetV3],
    account: &Account,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let mut balance_map = HashMap::new();
    let get_balance_tasks = assets
        .iter()
        .map(|asset| {
            let address = asset.address;
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

pub async fn get_batch_tokens_balance_for_link_v3(
    link: &LinkV3,
    canister_id: Principal,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let assets: Vec<AssetV3> = link
        .asset_info
        .iter()
        .map(|info| info.asset.clone())
        .collect();

    let subaccount = to_subaccount(&link.id)?;

    let link_account = Account {
        owner: canister_id,
        subaccount: Some(ByteBuf::from(subaccount.to_vec())),
    };

    get_batch_tokens_balance_v3(&assets, &link_account).await
}
