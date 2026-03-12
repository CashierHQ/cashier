// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{
        asset::v1::Asset,
        common::{AddressTypeV3, Wallet},
        intent::{
            v1::{IntentState, TransferData},
            v3::{CreateLinkToWalletIntentArgs, IntentTransactionDataV3, IntentTypeV3, IntentV3},
        },
    },
};

use uuid::Uuid;

pub struct TransferLinkToWalletIntent {
    pub intent: IntentV3,
}

impl TransferLinkToWalletIntent {
    pub fn new(intent: IntentV3) -> Self {
        Self { intent }
    }

    /// Creates a new TransferLinkToWalletIntent
    /// # Arguments
    /// * `input` - The arguments required to create the intent.
    /// # Returns
    /// * `Result<TransferLinkToWalletIntent, CanisterError>` - The resulting TransferLinkToWalletIntent or an error
    pub fn create(
        action_id: &str,
        input: CreateLinkToWalletIntentArgs,
    ) -> Result<Self, CanisterError> {
        let mut intent = IntentV3 {
            id: Uuid::new_v4().to_string(),
            label: input.label,
            intent_type: IntentTypeV3::Receive,
            asset: input.asset.clone(),
            amount: input.sending_amount.clone(),
            total_amount: None,
            network_fee: None,
            user_fee: None,
            source_address: input.source_address,
            source_account: Some(input.link_account),
            source_address_type: AddressTypeV3::Link,
            dest_address: input.receiver_id,
            dest_account: None,
            dest_address_type: AddressTypeV3::User,
            dependencies: vec![],
            intent_tx_data: None,
            action_id: action_id.to_string(),
            state: IntentState::Created,
            created_at: input.created_at_ts,
        };

        // enrich the intent with asset info
        let to_wallet = Wallet::new(input.receiver_id);
        let from_wallet: Wallet = input.link_account.into();

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
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::asset::v3::AssetV3;
    use cashier_common::test_utils::{random_id_string, random_principal_id};
    use icrc_ledger_types::icrc1::account::Account;

    #[test]
    fn it_should_create_transfer_link_to_wallet_intent() {
        // Arrange
        let action_id = random_id_string();
        let label = "Test Intent".to_string();
        let asset = AssetV3::default();
        let sending_amount = Nat::from(100u64);
        let receiver_id = random_principal_id();
        let source_address = random_principal_id();
        let link_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let expected_from_wallet: Wallet = link_account.into();
        let created_at_ts = 0;
        let input = CreateLinkToWalletIntentArgs {
            label: label.clone(),
            asset: asset.clone(),
            sending_amount: sending_amount.clone(),
            receiver_id,
            source_address,
            link_account,
            created_at_ts,
        };

        // Act
        let intent_result = TransferLinkToWalletIntent::create(&action_id, input);

        // Assert
        assert!(intent_result.is_ok());
        let intent = intent_result.unwrap();
        assert_eq!(intent.intent.label, label);
        assert_eq!(intent.intent.created_at, created_at_ts);
        assert_eq!(intent.intent.state, IntentState::Created);

        let intent_tx_data = intent.intent.intent_tx_data.unwrap();
        match intent_tx_data {
            IntentTransactionDataV3::Transfer(transfer_data) => {
                assert_eq!(transfer_data.amount, sending_amount);
                assert_eq!(
                    transfer_data.asset,
                    Asset::IC {
                        address: asset.address
                    }
                );
                assert_eq!(transfer_data.to, Wallet::new(receiver_id));
                assert_eq!(transfer_data.from, expected_from_wallet);
            }
            _ => panic!("Expected Transfer intent transaction data"),
        }
    }
}
