// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::{Chain, Wallet},
        intent::v1::{
            CreateWalletToTreasuryIntentArgs, Intent, IntentState, IntentTask, IntentType,
        },
    },
};
use cashier_common::constant::FEE_TREASURY_PRINCIPAL;
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

pub struct TransferWalletToTreasuryIntent {
    pub intent: Intent,
}

impl TransferWalletToTreasuryIntent {
    pub fn new(intent: Intent) -> Self {
        Self { intent }
    }

    /// Creates a new TransferWalletToTreasuryIntent.
    /// # Arguments
    /// * `input` - The arguments required to create the intent.
    /// # Returns
    /// * `Result<TransferWalletToTreasuryIntent, CanisterError>` - The resulting intent or an error if the creation fails.
    pub fn create(input: CreateWalletToTreasuryIntentArgs) -> Result<Self, CanisterError> {
        let mut intent = Intent {
            id: Uuid::new_v4().to_string(),
            label: input.label,
            state: IntentState::Created,
            created_at: input.created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::default_transfer_from(),
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
        let mut transfer_from_data = intent.r#type.as_transfer_from().ok_or_else(|| {
            CanisterError::HandleLogicError("TransferFrom data not found".to_string())
        })?;
        transfer_from_data.amount = input.actual_amount.clone();
        transfer_from_data.approve_amount = Some(input.approval_amount.clone());
        transfer_from_data.actual_amount = Some(input.actual_amount.clone());
        transfer_from_data.asset = input.asset.clone();
        transfer_from_data.from = from_wallet;
        transfer_from_data.to = to_wallet;
        transfer_from_data.spender = spender_wallet;
        intent.r#type = IntentType::TransferFrom(transfer_from_data);

        Ok(Self::new(intent))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::asset::v1::Asset;
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn it_should_create_transfer_wallet_to_treasury_intent() {
        // Arrange
        let label = "Test Intent".to_string();
        let asset = Asset::default();
        let actual_amount = Nat::from(100u64);
        let approval_amount = Nat::from(150u64);
        let sender_id = random_principal_id();
        let spender_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let created_at_ts = 0;
        let input = CreateWalletToTreasuryIntentArgs {
            label: label.clone(),
            asset: asset.clone(),
            actual_amount: actual_amount.clone(),
            approval_amount: approval_amount.clone(),
            sender_id,
            spender_account,
            created_at_ts,
        };

        // Act
        let intent_result = TransferWalletToTreasuryIntent::create(input);

        // Assert
        assert!(intent_result.is_ok());
        let intent = intent_result.unwrap().intent;
        assert_eq!(intent.label, label);
        assert_eq!(intent.created_at, created_at_ts);
        assert_eq!(intent.state, IntentState::Created);
        assert_eq!(intent.chain, Chain::IC);
        let intent_type = match intent.r#type {
            IntentType::TransferFrom(transfer_from_intent) => transfer_from_intent,
            _ => panic!("Expected TransferFrom intent type"),
        };
        assert_eq!(intent_type.amount, actual_amount.clone());
        assert_eq!(intent_type.approve_amount, Some(approval_amount));
        assert_eq!(intent_type.actual_amount, Some(actual_amount));
        assert_eq!(intent_type.asset, asset);
        assert_eq!(intent_type.from, Wallet::new(sender_id));
    }
}
