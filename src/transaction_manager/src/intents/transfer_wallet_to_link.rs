// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::{Asset, Chain, Wallet},
        intent::v1::{IntentState, IntentTask, IntentType},
        intent::v2::Intent,
    },
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

pub struct TransferWalletToLinkIntent {
    pub intent: Intent,
}

impl TransferWalletToLinkIntent {
    pub fn new(intent: Intent) -> Self {
        Self { intent }
    }

    /// Creates a new TransferWalletToLinkIntent.
    /// # Arguments
    /// * `label` - A label for the intent.
    /// * `asset` - The asset to be transferred.
    /// * `sending_amount` - The amount to be sent (including fees).
    /// * `source_amount` - The original amount before fees (for intent_total_amount).
    /// * `sender_id` - The Principal ID of the sender's wallet.
    /// * `link_account` - The account to which the tokens will be transferred.
    /// * `created_at_ts` - The timestamp when the intent is created.
    /// # Returns
    /// * `Result<TransferWalletToLinkIntent, CanisterError>` - The resulting intent or an error if the creation fails.
    pub fn create(
        label: String,
        asset: Asset,
        sending_amount: Nat,
        source_amount: Nat,
        sender_id: Principal,
        link_account: Account,
        created_at_ts: u64,
    ) -> Result<Self, CanisterError> {
        let mut intent = Intent {
            id: Uuid::new_v4().to_string(),
            label,
            state: IntentState::Created,
            created_at: created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToLink,
            r#type: IntentType::default_transfer(),
            // intent_total_amount = source amount (user input before fees)
            intent_total_amount: Some(source_amount),
            intent_total_network_fee: None,
            intent_user_fee: None,
        };

        // enrich the intent with asset info
        let from_wallet = Wallet::new(sender_id);
        let to_wallet: Wallet = link_account.into();

        let mut transfer_data = intent.r#type.as_transfer().ok_or_else(|| {
            CanisterError::HandleLogicError("Transfer data not found".to_string())
        })?;
        transfer_data.amount = sending_amount;
        transfer_data.asset = asset;
        transfer_data.from = from_wallet;
        transfer_data.to = to_wallet;
        intent.r#type = IntentType::Transfer(transfer_data);

        Ok(Self::new(intent))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn test_create_wallet_to_link_intent() {
        // Arrange
        let label = "Test Intent".to_string();
        let asset = Asset::default();
        let sending_amount = Nat::from(1000u64);
        let source_amount = Nat::from(900u64);
        let sender_id = random_principal_id();
        let link_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let ts = 1_632_192_100_000_000_000;

        // Act
        let intent_result = TransferWalletToLinkIntent::create(
            label.clone(),
            asset.clone(),
            sending_amount.clone(),
            source_amount.clone(),
            sender_id,
            link_account,
            ts,
        );

        // Assert
        assert!(intent_result.is_ok());
        let transfer_intent = intent_result.unwrap().intent;
        assert_eq!(transfer_intent.label, label);
        assert_eq!(transfer_intent.created_at, ts);
        assert_eq!(transfer_intent.state, IntentState::Created);
        assert_eq!(transfer_intent.chain, Chain::IC);

        let transfer_data = transfer_intent
            .r#type
            .as_transfer()
            .expect("Expected transfer data");

        assert_eq!(transfer_data.amount, sending_amount);
        assert_eq!(transfer_data.asset, asset);
        assert_eq!(transfer_data.from, Wallet::new(sender_id));
        assert_eq!(transfer_data.to, link_account.into());

        // Verify intent_total_amount is set from source_amount
        assert_eq!(transfer_intent.intent_total_amount, Some(source_amount));
    }
}
