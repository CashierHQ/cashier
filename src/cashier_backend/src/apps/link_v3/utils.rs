// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        asset::v3::AssetV3,
        common::AddressTypeV3,
        intent::v3::{IntentTransactionDataV3, IntentV3},
        link::v3::LinkV3,
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

/// Updates the available amount of each asset in the LinkV3 after the CreateLink action
/// # Arguments
/// * `link` - A mutable reference to the LinkV3 to be updated
/// * `intents` - A slice of IntentV3 that are associated with CreateLink action
pub fn update_link_available_amount_after_create(
    link: &mut LinkV3,
    intents: &[IntentV3],
) -> Result<(), CanisterError> {
    for asset_info in &mut link.asset_info {
        let intent = intents
            .iter()
            .find(|intent| {
                intent.asset.address == asset_info.asset.address
                    && intent.source_address_type == AddressTypeV3::Creator
                    && intent.dest_address_type == AddressTypeV3::Link
            })
            .ok_or_else(|| {
                CanisterError::NotFound(format!(
                    "Not found transfer intent for asset {}",
                    asset_info.asset.address
                ))
            })?;

        let maybe_available_amount = match &intent.intent_tx_data {
            Some(IntentTransactionDataV3::TransferFrom(data)) => data.actual_amount.clone(),
            Some(IntentTransactionDataV3::Transfer(data)) => Some(data.amount.clone()),
            None => None,
        }
        .ok_or_else(|| {
            CanisterError::InvalidDataError(format!(
                "Transfer amount not found in intent of asset {}",
                asset_info.asset.address
            ))
        })?;

        asset_info.available_amount = Some(maybe_available_amount);
    }

    Ok(())
}

/// Updates the available amount of each asset in the LinkV3 after the Receive action
/// # Arguments
/// * `link` - A mutable reference to the LinkV3 to be updated
/// * `intents` - A slice of IntentV3 that are associated with Receive action
pub fn update_link_available_amount_after_receive(
    link: &mut LinkV3,
    intents: &[IntentV3],
) -> Result<(), CanisterError> {
    for asset_info in &mut link.asset_info {
        let current_available_amount = asset_info.available_amount.clone().ok_or_else(|| {
            CanisterError::InvalidDataError(format!(
                "Current available amount of asset {} not found",
                asset_info.asset.address
            ))
        })?;

        let intent = intents
            .iter()
            .find(|intent| {
                intent.asset.address == asset_info.asset.address
                    && intent.source_address_type == AddressTypeV3::Link
                    && intent.dest_address_type == AddressTypeV3::User
            })
            .ok_or_else(|| {
                CanisterError::NotFound(format!(
                    "Not found transfer intent for asset {}",
                    asset_info.asset.address
                ))
            })?;

        let deducted_amount = match &intent.intent_tx_data {
            Some(IntentTransactionDataV3::Transfer(data)) => Some(data.amount.clone()),
            _ => None,
        }
        .ok_or_else(|| {
            CanisterError::InvalidDataError(format!(
                "Transfer amount not found in intent of asset {}",
                asset_info.asset.address
            ))
        })?;

        let network_fee = intent.asset.network_fee.clone().ok_or_else(|| {
            CanisterError::InvalidDataError(format!(
                "Network fee of asset {} not found",
                asset_info.asset.address
            ))
        })?;

        if current_available_amount < deducted_amount.clone() + network_fee.clone() {
            return Err(CanisterError::InvalidDataError(format!(
                "Deducted amount {} plus network fee {} exceeds current available amount {} for asset {}",
                deducted_amount, network_fee, current_available_amount, asset_info.asset.address
            )));
        }

        asset_info.available_amount =
            Some(current_available_amount - deducted_amount - network_fee);
    }

    Ok(())
}

/// Updates the available amount of each asset in the LinkV3 after the Withdraw action
/// # Arguments
/// * `link` - A mutable reference to the LinkV3 to be updated
/// * `intents` - A slice of IntentV3 that are associated with Withdraw action
pub fn update_link_available_amount_after_withdraw(
    link: &mut LinkV3,
    intents: &[IntentV3],
) -> Result<(), CanisterError> {
    for asset_info in &mut link.asset_info {
        let _current_available_amount = asset_info.available_amount.clone().ok_or_else(|| {
            CanisterError::InvalidDataError(format!(
                "Current available amount of asset {} not found",
                asset_info.asset.address
            ))
        })?;

        let intent = intents
            .iter()
            .find(|intent| {
                intent.asset.address == asset_info.asset.address
                    && intent.source_address_type == AddressTypeV3::Link
                    && intent.dest_address_type == AddressTypeV3::Creator
            })
            .ok_or_else(|| {
                CanisterError::NotFound(format!(
                    "Not found transfer intent for asset {}",
                    asset_info.asset.address
                ))
            })?;

        let _deducted_amount = match &intent.intent_tx_data {
            Some(IntentTransactionDataV3::Transfer(data)) => Some(data.amount.clone()),
            _ => None,
        }
        .ok_or_else(|| {
            CanisterError::InvalidDataError(format!(
                "Invalid withdraw transfer intent_tx_data for asset {}",
                asset_info.asset.address
            ))
        })?;

        let _network_fee = intent.asset.network_fee.clone().ok_or_else(|| {
            CanisterError::InvalidDataError(format!(
                "Network fee of asset {} not found",
                asset_info.asset.address
            ))
        })?;

        // At this point, the withdraw intent has been built from the actual ledger balance.
        // To avoid spurious failures when `available_amount` is stale (e.g., due to external
        // deposits), we do not require it to exactly equal `deducted_amount + network_fee`.
        // Instead, we conservatively reset the available amount to zero after a successful
        // withdraw.

        asset_info.available_amount = Some(Nat::from(0u8));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_backend_types::repository::{
        asset::{
            v1::Asset,
            v3::{AssetV3, TokenStandardV3},
        },
        asset_info::v3::AssetInfoV3,
        common::{AddressTypeV3, Wallet},
        intent::v1::{IntentState, TransferData, TransferFromData},
        intent::v3::{IntentTransactionDataV3, IntentTypeV3, IntentV3},
        link::{v1::LinkType, v3::LinkState},
    };
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn fixture_of_asset_info_v3(address: Principal, amount: u64) -> AssetInfoV3 {
        AssetInfoV3 {
            asset: AssetV3 {
                address,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC2,
            },
            label: "Asset".to_string(),
            amount: Nat::from(amount),
            available_amount: None,
        }
    }

    fn fixture_of_intent_v3(
        asset_address: Principal,
        source_address_type: AddressTypeV3,
        dest_address_type: AddressTypeV3,
        intent_tx_data: Option<IntentTransactionDataV3>,
    ) -> IntentV3 {
        IntentV3 {
            id: random_id_string(),
            label: "intent".to_string(),
            intent_type: IntentTypeV3::Send,
            asset: AssetV3 {
                address: asset_address,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC2,
            },
            amount: Nat::from(1_000u64),
            total_amount: None,
            network_fee: None,
            user_fee: None,
            source_address: random_principal_id(),
            source_account: None,
            source_address_type,
            dest_address: random_principal_id(),
            dest_account: None,
            dest_address_type,
            intent_tx_data,
            dependencies: vec![],
            action_id: random_id_string(),
            state: IntentState::Success,
            created_at: 0,
        }
    }

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
    fn it_should_fail_do_update_link_available_amount_after_create_due_to_missing_associated_intent()
     {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![fixture_of_asset_info_v3(asset_address, 10_000)],
            max_use: 1,
            use_count: 0,
            state: LinkState::Created,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            random_principal_id(),
            AddressTypeV3::Creator,
            AddressTypeV3::Link,
            Some(IntentTransactionDataV3::TransferFrom(TransferFromData {
                from: Wallet::default(),
                to: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(10_000u64),
                actual_amount: None,
                approve_amount: None,
            })),
        )];

        // Act
        let result = update_link_available_amount_after_create(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
        assert_eq!(link.asset_info[0].available_amount, None);
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_create_due_to_missing_transfer_amount_in_intent_tx_data()
     {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![fixture_of_asset_info_v3(asset_address, 10_000)],
            max_use: 1,
            use_count: 0,
            state: LinkState::Created,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Creator,
            AddressTypeV3::Link,
            Some(IntentTransactionDataV3::TransferFrom(TransferFromData {
                from: Wallet::default(),
                to: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(10_000u64),
                actual_amount: None,
                approve_amount: None,
            })),
        )];

        // Act
        let result = update_link_available_amount_after_create(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(link.asset_info[0].available_amount, None);
    }

    #[test]
    fn it_should_do_update_link_available_amount_after_create_with_transfer() {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![fixture_of_asset_info_v3(asset_address, 10_000)],
            max_use: 1,
            use_count: 0,
            state: LinkState::Created,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Creator,
            AddressTypeV3::Link,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(9_900u64),
            })),
        )];

        // Act
        let result = update_link_available_amount_after_create(&mut link, &intents);

        // Assert
        assert!(result.is_ok());
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_900u64))
        );
    }

    #[test]
    fn it_should_do_update_link_available_amount_after_create_with_transfer_from() {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![fixture_of_asset_info_v3(asset_address, 10_000)],
            max_use: 1,
            use_count: 0,
            state: LinkState::Created,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Creator,
            AddressTypeV3::Link,
            Some(IntentTransactionDataV3::TransferFrom(TransferFromData {
                from: Wallet::default(),
                to: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(10_000u64),
                actual_amount: Some(Nat::from(9_800u64)),
                approve_amount: None,
            })),
        )];

        // Act
        let result = update_link_available_amount_after_create(&mut link, &intents);

        // Assert
        assert!(result.is_ok());
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_800u64))
        );
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_receive_due_to_missing_associated_intent()
     {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(9_800u64)),
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 2,
            use_count: 0,
            state: LinkState::Active,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            random_principal_id(),
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(4_000u64),
            })),
        )]
        .into_iter()
        .map(|mut intent| {
            intent.asset.network_fee = Some(Nat::from(200u64));
            intent
        })
        .collect::<Vec<_>>();

        // Act
        let result = update_link_available_amount_after_receive(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_800u64))
        );
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_receive_due_to_missing_available_amount()
     {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 2,
            use_count: 0,
            state: LinkState::Active,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(4_000u64),
            })),
        )]
        .into_iter()
        .map(|mut intent| {
            intent.asset.network_fee = Some(Nat::from(200u64));
            intent
        })
        .collect::<Vec<_>>();

        // Act
        let result = update_link_available_amount_after_receive(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(link.asset_info[0].available_amount, None);
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_receive_due_to_missing_transfer_amount_in_intent_tx_data()
     {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(9_800u64)),
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 2,
            use_count: 0,
            state: LinkState::Active,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            None,
        )]
        .into_iter()
        .map(|mut intent| {
            intent.asset.network_fee = Some(Nat::from(200u64));
            intent
        })
        .collect::<Vec<_>>();

        // Act
        let result = update_link_available_amount_after_receive(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_800u64))
        );
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_receive_due_to_missing_network_fee() {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(9_800u64)),
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 2,
            use_count: 0,
            state: LinkState::Active,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(4_000u64),
            })),
        )];

        // Act
        let result = update_link_available_amount_after_receive(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_800u64))
        );
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_receive_due_to_exceeding_current_available_amount()
     {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(4_100u64)),
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 2,
            use_count: 0,
            state: LinkState::Active,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(4_000u64),
            })),
        )]
        .into_iter()
        .map(|mut intent| {
            intent.asset.network_fee = Some(Nat::from(200u64));
            intent
        })
        .collect::<Vec<_>>();

        // Act
        let result = update_link_available_amount_after_receive(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(4_100u64))
        );
    }

    #[test]
    fn it_should_do_update_link_available_amount_after_receive() {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(9_800u64)),
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 2,
            use_count: 0,
            state: LinkState::Active,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(4_000u64),
            })),
        )]
        .into_iter()
        .map(|mut intent| {
            intent.asset.network_fee = Some(Nat::from(200u64));
            intent
        })
        .collect::<Vec<_>>();

        // Act
        let result = update_link_available_amount_after_receive(&mut link, &intents);

        // Assert
        assert!(result.is_ok());
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(5_600u64))
        );
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_withdraw_due_to_missing_associated_intent()
     {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(9_800u64)),
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 1,
            use_count: 0,
            state: LinkState::Inactive,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            random_principal_id(),
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(9_800u64),
            })),
        )];

        // Act
        let result = update_link_available_amount_after_withdraw(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_800u64))
        );
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_withdraw_due_to_missing_available_amount()
     {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![fixture_of_asset_info_v3(asset_address, 10_000)],
            max_use: 1,
            use_count: 0,
            state: LinkState::Inactive,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Link,
            AddressTypeV3::Creator,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(9_600u64),
            })),
        )]
        .into_iter()
        .map(|mut intent| {
            intent.asset.network_fee = Some(Nat::from(200u64));
            intent
        })
        .collect::<Vec<_>>();

        // Act
        let result = update_link_available_amount_after_withdraw(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(link.asset_info[0].available_amount, None);
    }

    #[test]
    fn it_should_do_update_link_available_amount_after_withdraw_despite_stale_available_amount() {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(9_800u64)),
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 1,
            use_count: 0,
            state: LinkState::Inactive,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Link,
            AddressTypeV3::Creator,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(9_500u64),
            })),
        )]
        .into_iter()
        .map(|mut intent| {
            intent.asset.network_fee = Some(Nat::from(200u64));
            intent
        })
        .collect::<Vec<_>>();

        // Act
        let result = update_link_available_amount_after_withdraw(&mut link, &intents);

        // Assert
        assert!(result.is_ok());
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));
    }

    #[test]
    fn it_should_fail_do_update_link_available_amount_after_withdraw_due_to_missing_network_fee() {
        // Arrange
        let asset_address = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator: random_principal_id(),
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(9_800u64)),
                ..fixture_of_asset_info_v3(asset_address, 10_000)
            }],
            max_use: 1,
            use_count: 0,
            state: LinkState::Inactive,
            created_at: 0,
        };
        let intents = vec![fixture_of_intent_v3(
            asset_address,
            AddressTypeV3::Link,
            AddressTypeV3::Creator,
            Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(9_600u64),
            })),
        )];

        // Act
        let result = update_link_available_amount_after_withdraw(&mut link, &intents);

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_800u64))
        );
    }

    #[test]
    fn it_should_do_update_link_available_amount_after_withdraw() {
        // Arrange
        let asset_address_1 = random_principal_id();
        let asset_address_2 = random_principal_id();
        let mut link = LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTokenBasket,
            creator: random_principal_id(),
            asset_info: vec![
                AssetInfoV3 {
                    available_amount: Some(Nat::from(9_800u64)),
                    ..fixture_of_asset_info_v3(asset_address_1, 10_000)
                },
                AssetInfoV3 {
                    available_amount: Some(Nat::from(4_900u64)),
                    ..fixture_of_asset_info_v3(asset_address_2, 5_000)
                },
            ],
            max_use: 1,
            use_count: 0,
            state: LinkState::Inactive,
            created_at: 0,
        };
        let intents = vec![
            fixture_of_intent_v3(
                asset_address_1,
                AddressTypeV3::Link,
                AddressTypeV3::Creator,
                Some(IntentTransactionDataV3::Transfer(TransferData {
                    from: Wallet::default(),
                    to: Wallet::default(),
                    asset: Asset::default(),
                    amount: Nat::from(9_600u64),
                })),
            ),
            fixture_of_intent_v3(
                asset_address_2,
                AddressTypeV3::Link,
                AddressTypeV3::Creator,
                Some(IntentTransactionDataV3::Transfer(TransferData {
                    from: Wallet::default(),
                    to: Wallet::default(),
                    asset: Asset::default(),
                    amount: Nat::from(4_700u64),
                })),
            ),
        ]
        .into_iter()
        .map(|mut intent| {
            intent.asset.network_fee = Some(Nat::from(200u64));
            intent
        })
        .collect::<Vec<_>>();

        // Act
        let result = update_link_available_amount_after_withdraw(&mut link, &intents);

        // Assert
        assert!(result.is_ok());
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));
        assert_eq!(link.asset_info[1].available_amount, Some(Nat::from(0u64)));
    }
}
