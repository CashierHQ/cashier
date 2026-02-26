// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{asset::v3::AssetV3, link::v3::LinkV3},
};
use cashier_common::utils::get_link_account;
use std::collections::HashMap;

use crate::{
    api::state::get_state,
    apps::{token_balance::traits::TokenBalanceFetcher, token_fee::traits::TokenFeeCache},
};

pub async fn get_batch_tokens_fee_for_link_v3(
    link: &LinkV3,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let asset_principals = link_v3_asset_principals(link);

    // Use TokenFeeService from CanisterState (with caching)
    let mut state = get_state();
    state
        .token_fee_service
        .get_batch_tokens_fee(&asset_principals)
        .await
}

pub async fn get_batch_tokens_balance_for_link_v3(
    link: &LinkV3,
    canister_id: Principal,
) -> Result<HashMap<Principal, Nat>, CanisterError> {
    let asset_principals = link_v3_asset_principals(link);
    let link_account = get_link_account(&link.id, canister_id)?;

    let state = get_state();
    state
        .token_balance_service
        .get_batch_token_balances(&link_account.into(), &asset_principals)
        .await
}

pub fn link_v3_asset_principals(link: &LinkV3) -> Vec<Principal> {
    let assets = link
        .asset_info
        .iter()
        .map(|info| info.asset.clone())
        .collect::<Vec<AssetV3>>();

    assets.iter().map(|asset| asset.address).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_backend_types::repository::{
        asset::v3::{AssetV3, TokenStandardV3},
        asset_info::v3::AssetInfoV3,
        link::{v1::LinkType, v3::LinkState},
    };
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    #[test]
    fn test_link_v3_asset_principals() {
        let ledger_id_1 = random_principal_id();
        let ledger_id_2 = random_principal_id();
        let asset_info_1 = AssetInfoV3 {
            asset: AssetV3 {
                address: ledger_id_1,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC1,
            },
            label: "Asset 1".to_string(),
            amount: Nat::from(10_000u64),
        };

        let asset_info_2 = AssetInfoV3 {
            asset: AssetV3 {
                address: ledger_id_2,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC1,
            },
            label: "Asset 2".to_string(),
            amount: Nat::from(20_000u64),
        };

        let link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTokenBasket,
            creator: random_principal_id(),
            asset_info: vec![asset_info_1, asset_info_2],
            max_use: 5,
            use_count: 0,
            state: LinkState::Active,
            created_at: 0,
        };
        let asset_principals = link_v3_asset_principals(&link);
        assert_eq!(asset_principals.len(), 2);
        assert!(asset_principals.contains(&ledger_id_1));
        assert!(asset_principals.contains(&ledger_id_2));
    }
}
