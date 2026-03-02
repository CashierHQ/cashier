// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{
        asset::v1::Asset,
        common::{AddressTypeV3, Wallet},
        intent::{
            v1::{IntentState, TransferData, TransferFromData},
            v3::{
                CreateIcrc1WalletToLinkIntentArgs, CreateIcrc2WalletToLinkIntentArgs,
                IntentTransactionDataV3, IntentTypeV3, IntentV3,
            },
        },
    },
};
use uuid::Uuid;

pub struct TransferWalletToLinkIntent {
    pub intent: IntentV3,
}

impl TransferWalletToLinkIntent {
    pub fn new(intent: IntentV3) -> Self {
        Self { intent }
    }

    /// Creates a new TransferWalletToLinkIntent.
    /// # Arguments
    /// * `input` - The arguments required to create the intent.
    /// # Returns
    /// * `Result<TransferWalletToLinkIntent, CanisterError>` - The resulting intent or an error if the creation fails.
    pub fn create_icrc1(
        action_id: &str,
        input: CreateIcrc1WalletToLinkIntentArgs,
    ) -> Result<Self, CanisterError> {
        let mut intent = IntentV3 {
            id: Uuid::new_v4().to_string(),
            label: input.label,
            intent_type: IntentTypeV3::Send,
            asset: input.asset.clone(),
            amount: input.sending_amount.clone(),
            total_amount: Some(input.sending_amount.clone()),
            network_fee: None,
            user_fee: None,
            source_address: input.sender_id,
            source_account: None,
            source_address_type: AddressTypeV3::Creator,
            dest_address: input.receiver_id,
            dest_account: Some(input.link_account),
            dest_address_type: AddressTypeV3::Link,
            state: IntentState::Created,
            intent_tx_data: None,
            dependencies: vec![],
            action_id: action_id.to_string(),
            created_at: input.created_at_ts,
        };

        // enrich the intent with asset info
        let from_wallet = Wallet::new(input.sender_id);
        let to_wallet: Wallet = input.link_account.into();

        let transfer_data = TransferData {
            amount: input.sending_amount.clone(),
            asset: Asset::IC {
                address: input.asset.address,
            },
            from: from_wallet,
            to: to_wallet,
        };

        intent.intent_tx_data = Some(IntentTransactionDataV3::Transfer(transfer_data));

        Ok(Self::new(intent))
    }

    /// Creates a new TransferWalletToLinkIntent using ICRC2 standard.
    /// # Arguments
    /// * `input` - The arguments required to create the intent.
    /// # Returns
    /// * `Result<TransferWalletToLinkIntent, CanisterError>` - The resulting intent or an error if the creation fails.
    pub fn create_icrc2(
        action_id: &str,
        input: CreateIcrc2WalletToLinkIntentArgs,
    ) -> Result<Self, CanisterError> {
        let mut intent = IntentV3 {
            id: Uuid::new_v4().to_string(),
            label: input.label,
            intent_type: IntentTypeV3::Send,
            asset: input.asset.clone(),
            amount: input.user_ui_input_asset_amount.clone(),
            total_amount: Some(input.actual_amount.clone()),
            network_fee: None,
            user_fee: None,
            source_address: input.sender_id,
            source_account: None,
            source_address_type: AddressTypeV3::Creator,
            dest_address: input.receiver_id,
            dest_account: Some(input.link_account),
            dest_address_type: AddressTypeV3::Link,
            state: IntentState::Created,
            intent_tx_data: None,
            dependencies: vec![],
            action_id: action_id.to_string(),
            created_at: input.created_at_ts,
        };

        // enrich the intent with asset info
        let from_wallet = Wallet::new(input.sender_id);
        let to_wallet: Wallet = input.link_account.into();
        let spender_wallet: Wallet = input.spender_account.into();

        let transfer_from_data = TransferFromData {
            amount: input.actual_amount.clone(),
            approve_amount: Some(input.approval_amount.clone()),
            actual_amount: Some(input.actual_amount.clone()),
            asset: Asset::IC {
                address: input.asset.address,
            },
            from: from_wallet,
            to: to_wallet,
            spender: spender_wallet,
        };

        intent.intent_tx_data = Some(IntentTransactionDataV3::TransferFrom(transfer_from_data));

        Ok(Self::new(intent))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::asset::v3::AssetV3;
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use icrc_ledger_types::icrc1::account::Account;

    #[test]
    fn it_should_create_icrc1_wallet_to_link_intent() {
        // Arrange
        let action_id = random_id_string();
        let label = "Test Intent".to_string();
        let asset = AssetV3::default();
        let amount = Nat::from(1000u64);
        let sender_id = random_principal_id();
        let receiver_id = random_principal_id();
        let link_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let ts = 1_632_192_100_000_000_000;
        let input_arg = CreateIcrc1WalletToLinkIntentArgs {
            label: label.clone(),
            asset: asset.clone(),
            user_ui_input_asset_amount: amount.clone(),
            max_use: 1,
            sending_amount: amount.clone(),
            sender_id,
            receiver_id,
            link_account,
            created_at_ts: ts,
        };

        // Act
        let intent_result = TransferWalletToLinkIntent::create_icrc1(&action_id, input_arg);

        // Assert
        assert!(intent_result.is_ok());
        let transfer_intent = intent_result.unwrap().intent;
        assert_eq!(transfer_intent.label, label);
        assert_eq!(transfer_intent.action_id, action_id);
        assert_eq!(transfer_intent.created_at, ts);
        assert_eq!(transfer_intent.state, IntentState::Created);

        let transfer_data = transfer_intent.intent_tx_data.unwrap();
        match transfer_data {
            IntentTransactionDataV3::Transfer(transfer_data) => {
                assert_eq!(transfer_data.amount, amount);
                assert_eq!(transfer_data.asset.get_address(), asset.address);
                assert_eq!(transfer_data.from, Wallet::new(sender_id));
                assert_eq!(transfer_data.to, link_account.into());
            }
            _ => panic!("Expected Transfer intent transaction data"),
        }
    }

    #[test]
    fn it_should_create_icrc2_wallet_to_link_intent() {
        // Arrange
        let action_id = random_id_string();
        let label = "Test Intent".to_string();
        let asset = AssetV3::default();
        let actual_amount = Nat::from(1000u64);
        let approval_amount = Nat::from(1500u64);
        let sender_id = random_principal_id();
        let spender_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let receiver_id = random_principal_id();
        let link_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let ts = 1_632_192_100_000_000_000;
        let input_arg = CreateIcrc2WalletToLinkIntentArgs {
            label: label.clone(),
            asset: asset.clone(),
            user_ui_input_asset_amount: actual_amount.clone(),
            max_use: 1,
            actual_amount: actual_amount.clone(),
            approval_amount: approval_amount.clone(),
            sender_id,
            spender_account,
            receiver_id,
            link_account,
            created_at_ts: ts,
        };

        // Act
        let intent_result = TransferWalletToLinkIntent::create_icrc2(&action_id, input_arg);

        // Assert
        assert!(intent_result.is_ok());
        let transfer_intent = intent_result.unwrap().intent;
        assert_eq!(transfer_intent.label, label);
        assert_eq!(transfer_intent.created_at, ts);
        assert_eq!(transfer_intent.state, IntentState::Created);
        assert_eq!(transfer_intent.action_id, action_id);
        let transfer_from_data = transfer_intent.intent_tx_data.unwrap();

        match transfer_from_data {
            IntentTransactionDataV3::TransferFrom(transfer_from_data) => {
                assert_eq!(transfer_from_data.amount, actual_amount.clone());
                assert_eq!(
                    transfer_from_data.approve_amount,
                    Some(approval_amount.clone())
                );
                assert_eq!(
                    transfer_from_data.actual_amount,
                    Some(actual_amount.clone())
                );
                assert_eq!(transfer_from_data.asset.get_address(), asset.address);
                assert_eq!(transfer_from_data.from, Wallet::new(sender_id));
                assert_eq!(transfer_from_data.to, link_account.into());
                assert_eq!(transfer_from_data.spender, spender_account.into());
            }
            _ => panic!("Expected TransferFrom intent transaction data"),
        }
    }
}
