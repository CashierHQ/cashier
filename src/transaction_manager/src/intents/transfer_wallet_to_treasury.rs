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
    /// * `label` - A label for the intent.
    /// * `asset` - The asset to be transferred.
    /// * `actual_amount` - The actual amount to be sent.
    /// * `approval_amount` - The amount to be approved for transfer.
    /// * `sender_id` - The Principal ID of the sender's wallet.
    /// * `spender_account` - The account which is approved to spend the tokens.
    /// * `created_at_ts` - The timestamp when the intent is created.
    /// # Returns
    /// * `Result<TransferWalletToTreasuryIntent, CanisterError>` - The resulting intent or an error if the creation fails.
    pub fn create(
        label: String,
        asset: Asset,
        actual_amount: u64,
        approval_amount: u64,
        sender_id: Principal,
        spender_account: Account,
        created_at_ts: u64,
    ) -> Result<Self, CanisterError> {
        let mut intent = Intent {
            id: Uuid::new_v4().to_string(),
            label,
            state: IntentState::Created,
            created_at: created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::default_transfer_from(),
            intent_total_amount: None,
            intent_total_network_fee: None,
            intent_user_fee: None,
        };

        // enrich the intent with asset info
        let from_wallet = Wallet::new(sender_id);
        let to_wallet: Wallet = Account {
            owner: FEE_TREASURY_PRINCIPAL,
            subaccount: None,
        }
        .into();
        let spender_wallet: Wallet = spender_account.into();

        // TransferFrom case
        let mut transfer_from_data = intent.r#type.as_transfer_from().ok_or_else(|| {
            CanisterError::HandleLogicError("TransferFrom data not found".to_string())
        })?;
        transfer_from_data.amount = Nat::from(actual_amount);
        transfer_from_data.approve_amount = Some(Nat::from(approval_amount));
        transfer_from_data.actual_amount = Some(Nat::from(actual_amount));
        transfer_from_data.asset = asset;
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
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn test_create_transfer_wallet_to_treasury_intent() {
        // Arrange
        let label = "Test Intent".to_string();
        let asset = Asset::default();
        let actual_amount = 100u64;
        let approval_amount = 150u64;
        let sender_id = random_principal_id();
        let spender_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let created_at_ts = 0;

        // Act
        let intent_result = TransferWalletToTreasuryIntent::create(
            label.clone(),
            asset.clone(),
            actual_amount,
            approval_amount,
            sender_id,
            spender_account,
            created_at_ts,
        );

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
        assert_eq!(intent_type.amount, Nat::from(actual_amount));
        assert_eq!(intent_type.approve_amount, Some(Nat::from(approval_amount)));
        assert_eq!(intent_type.actual_amount, Some(Nat::from(actual_amount)));
        assert_eq!(intent_type.asset, asset);
        assert_eq!(intent_type.from, Wallet::new(sender_id));
    }
}
