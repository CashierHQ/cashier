// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{
        asset::v1::Asset,
        common::{AddressTypeV3, Wallet},
        intent::{
            v1::{IntentState, TransferFromData},
            v3::{
                CreateWalletToTreasuryIntentArgs, IntentTransactionDataV3, IntentTypeV3, IntentV3,
            },
        },
    },
};
use cashier_common::constant::FEE_TREASURY_PRINCIPAL;
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

#[derive(Debug)]
pub struct TransferWalletToTreasuryIntent {
    pub intent: IntentV3,
}

impl TransferWalletToTreasuryIntent {
    pub fn new(intent: IntentV3) -> Self {
        Self { intent }
    }

    /// Creates a new TransferWalletToTreasuryIntent.
    /// # Arguments
    /// * `input` - The arguments required to create the intent.
    /// # Returns
    /// * `Result<TransferWalletToTreasuryIntent, CanisterError>` - The resulting intent or an error if the creation fails.
    pub fn create(
        action_id: &str,
        input: CreateWalletToTreasuryIntentArgs,
    ) -> Result<Self, CanisterError> {
        let mut intent = IntentV3 {
            id: Uuid::new_v4().to_string(),
            label: input.label,
            intent_type: IntentTypeV3::Send,
            asset: input.asset.clone(),
            amount: input.actual_amount.clone(),
            total_amount: None,
            network_fee: None,
            user_fee: None,
            source_address: input.sender_id,
            source_account: None,
            source_address_type: AddressTypeV3::Creator,
            dest_address: input.receiver_id,
            dest_account: None,
            dest_address_type: AddressTypeV3::Treasury,
            state: IntentState::Created,
            intent_tx_data: None,
            dependencies: vec![],
            action_id: action_id.to_string(),
            created_at: input.created_at_ts,
        };

        // enrich the intent with asset info
        let from_wallet = Wallet::new(input.sender_id);
        let to_wallet: Wallet = Account {
            owner: FEE_TREASURY_PRINCIPAL,
            subaccount: None,
        }
        .into();
        let spender_wallet: Wallet = input.spender_account.into();

        // TransferFrom case
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

    #[test]
    fn it_should_create_transfer_wallet_to_treasury_intent() {
        // Arrange
        let action_id = random_id_string();
        let label = "Test Intent".to_string();
        let asset = AssetV3::default();
        let actual_amount = Nat::from(100u64);
        let approval_amount = Nat::from(150u64);
        let sender_id = random_principal_id();
        let spender_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let receiver_id = random_principal_id();
        let created_at_ts = 0;
        let input = CreateWalletToTreasuryIntentArgs {
            label: label.clone(),
            asset: asset.clone(),
            actual_amount: actual_amount.clone(),
            approval_amount: approval_amount.clone(),
            sender_id,
            spender_account,
            receiver_id,
            created_at_ts,
        };

        // Act
        let intent_result = TransferWalletToTreasuryIntent::create(&action_id, input);

        // Assert
        assert!(intent_result.is_ok());
        let intent = intent_result.unwrap().intent;
        assert_eq!(intent.label, label);
        assert_eq!(intent.created_at, created_at_ts);
        assert_eq!(intent.state, IntentState::Created);
        assert_eq!(intent.action_id, action_id);

        let intent_tx_data = intent.intent_tx_data.unwrap();
        match intent_tx_data {
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
                assert_eq!(transfer_from_data.to, Wallet::new(receiver_id));
                assert_eq!(transfer_from_data.spender, Wallet::from(spender_account));
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
    }
}
