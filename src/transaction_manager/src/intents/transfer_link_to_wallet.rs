// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::{Chain, Wallet},
        intent::v1::{CreateLinkToWalletIntentArgs, Intent, IntentState, IntentTask, IntentType},
    },
};

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
    /// * `input` - The arguments required to create the intent.
    /// # Returns
    /// * `Result<TransferLinkToWalletIntent, CanisterError>` - The resulting TransferLinkToWalletIntent or an error
    pub fn create(input: CreateLinkToWalletIntentArgs) -> Result<Self, CanisterError> {
        let mut intent = Intent {
            id: Uuid::new_v4().to_string(),
            label: input.label,
            state: IntentState::Created,
            created_at: input.created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::default_transfer(),
        };

        // enrich the intent with asset info
        let to_wallet = Wallet::new(input.receiver_id);
        let from_wallet: Wallet = input.link_account.into();

        let mut transfer_data = intent.r#type.as_transfer().ok_or_else(|| {
            CanisterError::HandleLogicError("Transfer data not found".to_string())
        })?;
        transfer_data.amount = input.sending_amount;
        transfer_data.asset = input.asset;
        transfer_data.from = from_wallet;
        transfer_data.to = to_wallet;

        intent.r#type = IntentType::Transfer(transfer_data);

        Ok(Self::new(intent))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::common::Asset;
    use cashier_common::test_utils::random_principal_id;
    use icrc_ledger_types::icrc1::account::Account;

    #[test]
    fn it_should_create_transfer_link_to_wallet_intent() {
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
        let input = CreateLinkToWalletIntentArgs {
            label: label.clone(),
            asset: asset.clone(),
            sending_amount: sending_amount.clone(),
            receiver_id,
            link_account,
            created_at_ts,
        };

        // Act
        let intent_result = TransferLinkToWalletIntent::create(input);

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
