// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::{
        INTENT_LABEL_RECEIVE_PAYMENT_ASSET, INTENT_LABEL_SEND_AIRDROP_ASSET,
        INTENT_LABEL_SEND_TIP_ASSET, INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
    },
    repository::{
        asset::v3::AssetV3,
        link::{v1::LinkType, v3::LinkV3},
    },
};

/// Helper function to extract asset principals from a LinkV3
/// # Arguments
/// * `link` - A reference to the LinkV3 from which to extract asset principals
/// # Returns
/// * Vec<Principal> - A vector of asset principals extracted from the LinkV3
pub fn link_v3_asset_principals(link: &LinkV3) -> Vec<Principal> {
    let assets = link
        .asset_info
        .iter()
        .map(|info| info.asset.clone())
        .collect::<Vec<AssetV3>>();

    assets.iter().map(|asset| asset.address).collect()
}

/// Generate the label for an intent based on the link type and asset
/// # Arguments
/// * `link_type` - The type of the link (e.g. SendTip, SendAirdrop, SendTokenBasket, ReceivePayment)
/// * `asset` - The asset associated with the intent
/// # Returns
/// * `String` - The generated intent label in the format of "{INTENT_LABEL}_{ASSET_PRINCIPAL}"
pub fn generate_intent_asset_label(link_type: LinkType, ledger_id: Principal) -> String {
    match link_type {
        LinkType::SendTip => format!("{}_{}", INTENT_LABEL_SEND_TIP_ASSET, ledger_id.to_text()),
        LinkType::SendAirdrop => format!(
            "{}_{}",
            INTENT_LABEL_SEND_AIRDROP_ASSET,
            ledger_id.to_text()
        ),
        LinkType::SendTokenBasket => format!(
            "{}_{}",
            INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
            ledger_id.to_text()
        ),
        LinkType::ReceivePayment => format!(
            "{}_{}",
            INTENT_LABEL_RECEIVE_PAYMENT_ASSET,
            ledger_id.to_text()
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::{
        asset::v3::TokenStandardV3, asset_info::v3::AssetInfoV3, link::v3::LinkState,
    };
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    #[test]
    fn it_should_link_v3_asset_principals() {
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
            available_amount: None,
        };

        let asset_info_2 = AssetInfoV3 {
            asset: AssetV3 {
                address: ledger_id_2,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC1,
            },
            label: "Asset 2".to_string(),
            amount: Nat::from(20_000u64),
            available_amount: None,
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

    #[test]
    fn it_should_generate_intent_asset_label() {
        // Arrange
        let ledger_id = random_principal_id();
        let link_types = vec![
            LinkType::SendTip,
            LinkType::SendAirdrop,
            LinkType::SendTokenBasket,
            LinkType::ReceivePayment,
        ];

        // Act & Assert
        for link_type in link_types {
            let label = generate_intent_asset_label(link_type, ledger_id);
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
