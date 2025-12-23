// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::{Asset, Chain, Wallet},
        intent::v1::{Intent, IntentState, IntentTask, IntentType},
    },
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

pub struct TransferLinkToWalletIntent {
    pub intent: Intent,
}

impl TransferLinkToWalletIntent {
    pub fn new(intent: Intent) -> Self {
        Self { intent }
    }

    /// Creates a new TransferLinkToWalletIntent
    /// # Arguments
    /// * `label` - A label for the intent
    /// * `asset` - The asset to be transferred
    /// * `sending_amount` - The amount to be sent
    /// * `receiver_id` - The principal of the receiver's wallet
    /// * `link_account` - The account associated with the link
    /// * `created_at_ts` - The timestamp when the intent is created
    /// # Returns
    /// * `Result<TransferLinkToWalletIntent, CanisterError>` - The resulting TransferLinkToWalletIntent or an error
    pub fn create(
        label: String,
        asset: Asset,
        sending_amount: Nat,
        receiver_id: Principal,
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
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::default_transfer(),
        };

        // enrich the intent with asset info
        let to_wallet = Wallet::new(receiver_id);
        let from_wallet: Wallet = link_account.into();

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
    fn test_create_transfer_link_to_wallet_intent() {
        // Arrange
        let label = "Test Intent".to_string();
        let asset = Asset::default();
        let sending_amount = Nat::from(100u64);
        let receiver_id = random_principal_id();
        let link_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let created_at_ts = 0;

        // Act
        let intent_result = TransferLinkToWalletIntent::create(
            label.clone(),
            asset.clone(),
            sending_amount.clone(),
            receiver_id,
            link_account,
            created_at_ts,
        );

        // Assert
        assert!(intent_result.is_ok());
        let intent = intent_result.unwrap();
        assert_eq!(intent.intent.label, label);
        assert_eq!(intent.intent.created_at, created_at_ts);
        assert_eq!(intent.intent.state, IntentState::Created);
        assert_eq!(intent.intent.chain, Chain::IC);

        let intent_type = match intent.intent.r#type {
            IntentType::Transfer(transfer_intent) => transfer_intent,
            _ => panic!("Expected Transfer intent type"),
        };
        assert_eq!(intent_type.amount, sending_amount);
        assert_eq!(intent_type.asset, asset);
        assert_eq!(intent_type.to, Wallet::new(receiver_id));
        assert_eq!(intent_type.from, link_account.into());
    }
}
