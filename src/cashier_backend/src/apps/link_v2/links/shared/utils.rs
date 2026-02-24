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

/// Retrieves token balances for a collection of assets in parallel.
///
/// This helper function queries multiple token canisters concurrently to fetch
/// balances for the specified account. All balance queries are executed in parallel
/// using `future::join_all` for optimal performance.
///
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
/// * `link_type` - The type of the link (e.g. SendTip, SendAirdrop, SendTokenBasket, ReceivePayment)
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
    use candid::Nat;
    use cashier_backend_types::repository::{
        asset_info::AssetInfo,
        link::v1::{LinkState, LinkType},
    };
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

    #[test]
    fn it_should_extract_link_assets() {
        // Arrange
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let asset_info1 = AssetInfo {
            asset: Asset::IC {
                address: ledger_id1,
            },
            label: "Test Asset1".to_string(),
            amount_per_link_use_action: Nat::from(100u64),
        };
        let asset_info2 = AssetInfo {
            asset: Asset::IC {
                address: ledger_id2,
            },
            label: "Test Asset2".to_string(),
            amount_per_link_use_action: Nat::from(200u64),
        };
        let link = Link {
            id: "test-link-id".to_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![asset_info1, asset_info2],
            link_use_action_max_count: 3,
            link_use_action_counter: 0,
            state: LinkState::Active,
            create_at: 0,
        };

        // Act
        let assets = link_assets(&link);

        // Assert
        assert_eq!(assets.len(), 3); // 2 from asset_info + 1 ICP
        assert!(assets.contains(&Asset::IC {
            address: ledger_id1
        }));
        assert!(assets.contains(&Asset::IC {
            address: ledger_id2
        }));
    }

    #[test]
    fn it_should_extract_link_asset_principals() {
        // Arrange
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let asset_info1 = AssetInfo {
            asset: Asset::IC {
                address: ledger_id1,
            },
            label: "Test Asset1".to_string(),
            amount_per_link_use_action: Nat::from(100u64),
        };
        let asset_info2 = AssetInfo {
            asset: Asset::IC {
                address: ledger_id2,
            },
            label: "Test Asset2".to_string(),
            amount_per_link_use_action: Nat::from(200u64),
        };
        let link = Link {
            id: "test-link-id".to_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![asset_info1, asset_info2],
            link_use_action_max_count: 3,
            link_use_action_counter: 0,
            state: LinkState::Active,
            create_at: 0,
        };

        // Act
        let asset_principals = link_asset_principals(&link);

        // Assert
        assert_eq!(asset_principals.len(), 3); // 2 from asset_info + 1 ICP
        assert!(asset_principals.contains(&ledger_id1));
        assert!(asset_principals.contains(&ledger_id2));
    }
}
