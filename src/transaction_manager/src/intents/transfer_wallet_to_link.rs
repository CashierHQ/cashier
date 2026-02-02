// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::{Chain, Wallet},
        intent::v1::{
            CreateIcrc1WalletToLinkIntentArgs, CreateIcrc2WalletToLinkIntentArgs, Intent,
            IntentState, IntentTask, IntentType,
        },
    },
};
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
    /// * `input` - The arguments required to create the intent.
    /// # Returns
    /// * `Result<TransferWalletToLinkIntent, CanisterError>` - The resulting intent or an error if the creation fails.
    pub fn create_icrc1(input: CreateIcrc1WalletToLinkIntentArgs) -> Result<Self, CanisterError> {
        let mut intent = Intent {
            id: Uuid::new_v4().to_string(),
            label: input.label,
            state: IntentState::Created,
            created_at: input.created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToLink,
            r#type: IntentType::default_transfer(),
        };

        // enrich the intent with asset info
        let from_wallet = Wallet::new(input.sender_id);
        let to_wallet: Wallet = input.link_account.into();

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

    /// Creates a new TransferWalletToLinkIntent using ICRC2 standard.
    /// # Arguments
    /// * `input` - The arguments required to create the intent.
    /// # Returns
    /// * `Result<TransferWalletToLinkIntent, CanisterError>` - The resulting intent or an error if the creation fails.
    pub fn create_icrc2(input: CreateIcrc2WalletToLinkIntentArgs) -> Result<Self, CanisterError> {
        let mut intent = Intent {
            id: Uuid::new_v4().to_string(),
            label: input.label,
            state: IntentState::Created,
            created_at: input.created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToLink,
            r#type: IntentType::default_transfer_from(),
        };

        // enrich the intent with asset info
        let from_wallet = Wallet::new(input.sender_id);
        let to_wallet: Wallet = input.link_account.into();
        let spender_wallet: Wallet = input.spender_account.into();

        // TransferFrom case
        let mut transfer_from_data = intent.r#type.as_transfer_from().ok_or_else(|| {
            CanisterError::HandleLogicError("TransferFrom data not found".to_string())
        })?;
        transfer_from_data.amount = input.actual_amount.clone();
        transfer_from_data.approve_amount = Some(input.approval_amount);
        transfer_from_data.actual_amount = Some(input.actual_amount);
        transfer_from_data.asset = input.asset;
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
    use candid::{Nat, Principal};
    use cashier_backend_types::repository::common::Asset;
    use cashier_common::test_utils::random_principal_id;
    use icrc_ledger_types::icrc1::account::Account;

    #[test]
    fn it_should_create_icrc1_wallet_to_link_intent() {
        // Arrange
        let label = "Test Intent".to_string();
        let asset = Asset::default();
        let amount = Nat::from(1000u64);
        let sender_id = random_principal_id();
        let link_account = Account {
            owner: random_principal_id(),
            subaccount: None,
        };
        let ts = 1_632_192_100_000_000_000;
        let input_arg = CreateIcrc1WalletToLinkIntentArgs {
            label: label.clone(),
            asset: asset.clone(),
            sending_amount: amount.clone(),
            sender_id,
            link_account,
            created_at_ts: ts,
        };

        // Act
        let intent_result = TransferWalletToLinkIntent::create_icrc1(input_arg);

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

        assert_eq!(transfer_data.amount, amount);
        assert_eq!(transfer_data.asset, asset);
        assert_eq!(transfer_data.from, Wallet::new(sender_id));
        assert_eq!(transfer_data.to, link_account.into());
    }
}
