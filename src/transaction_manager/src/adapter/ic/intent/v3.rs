// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::AddressTypeV3,
        intent::v3::{IntentTransactionDataV3, IntentV3},
        transaction::v1::Transaction,
    },
};

use crate::adapter::ic::intent::{traits::IntentAdapterTraitV3, v1::IcIntentAdapter};

impl IntentAdapterTraitV3 for IcIntentAdapter {
    fn intent_to_transactions_v3(
        &self,
        _canister_id: Principal,
        ts: u64,
        intent: &IntentV3,
    ) -> Result<Vec<Transaction>, CanisterError> {
        match intent.intent_tx_data.clone() {
            Some(IntentTransactionDataV3::Transfer(transfer_data)) => {
                if intent.source_address_type == AddressTypeV3::Creator {
                    self.assemble_icrc1_wallet_transfer(ts, transfer_data)
                } else {
                    self.assemble_icrc1_canister_transfer(ts, transfer_data)
                }
            }
            Some(IntentTransactionDataV3::TransferFrom(transfer_from_data)) => {
                self.assemble_icrc2_wallet_transfer(ts, transfer_from_data)
            }
            None => Err(CanisterError::HandleLogicError(
                "Missing transaction data in intent".to_string(),
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::{
        asset::v1::Asset,
        asset::v3::AssetV3,
        common::Wallet,
        intent::v1::{IntentState, TransferData, TransferFromData},
        intent::v3::IntentTypeV3,
        transaction::v1::{FromCallType, IcTransaction, Protocol},
    };
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn fixture_intent_v3(
        source_address_type: AddressTypeV3,
        intent_tx_data: Option<IntentTransactionDataV3>,
    ) -> IntentV3 {
        IntentV3 {
            id: random_id_string(),
            label: "test-intent-v3".to_string(),
            intent_type: IntentTypeV3::Send,
            asset: AssetV3::default(),
            amount: Nat::from(100u64),
            total_amount: Some(Nat::from(100u64)),
            network_fee: None,
            user_fee: None,
            source_address: random_principal_id(),
            source_account: None,
            source_address_type,
            dest_address: random_principal_id(),
            dest_account: None,
            dest_address_type: AddressTypeV3::Link,
            intent_tx_data,
            dependencies: vec![],
            action_id: random_id_string(),
            state: IntentState::Created,
            created_at: 1_632_144_000,
        }
    }

    #[test]
    fn it_should_fail_convert_intent_to_transactions_v3_due_to_missing_transaction_data() {
        // Arrange
        let adapter = IcIntentAdapter;
        let intent = fixture_intent_v3(AddressTypeV3::Creator, None);

        // Act
        let result =
            adapter.intent_to_transactions_v3(Principal::anonymous(), 1_632_144_000, &intent);

        // Assert
        assert!(matches!(
            result,
            Err(CanisterError::HandleLogicError(ref msg))
                if msg == "Missing transaction data in intent"
        ));
    }

    #[test]
    fn it_should_fail_convert_transfer_from_intent_to_transactions_v3_due_to_missing_approve_amount()
     {
        // Arrange
        let adapter = IcIntentAdapter;
        let transfer_from_data = TransferFromData {
            from: Wallet::new(random_principal_id()),
            to: Wallet::new(random_principal_id()),
            spender: Wallet::new(random_principal_id()),
            asset: Asset::default(),
            amount: Nat::from(100u64),
            actual_amount: Some(Nat::from(80u64)),
            approve_amount: None,
        };
        let intent = fixture_intent_v3(
            AddressTypeV3::Creator,
            Some(IntentTransactionDataV3::TransferFrom(transfer_from_data)),
        );

        // Act
        let result =
            adapter.intent_to_transactions_v3(Principal::anonymous(), 1_632_144_000, &intent);

        // Assert
        assert!(matches!(
            result,
            Err(CanisterError::InvalidInput(ref msg)) if msg == "approve_amount not found"
        ));
    }

    #[test]
    fn it_should_succeed_convert_transfer_intent_to_wallet_transactions_v3() {
        // Arrange
        let adapter = IcIntentAdapter;
        let transfer_data = TransferData {
            from: Wallet::new(random_principal_id()),
            to: Wallet::new(random_principal_id()),
            asset: Asset::default(),
            amount: Nat::from(120u64),
        };
        let intent = fixture_intent_v3(
            AddressTypeV3::Creator,
            Some(IntentTransactionDataV3::Transfer(transfer_data.clone())),
        );

        // Act
        let result = adapter
            .intent_to_transactions_v3(Principal::anonymous(), 1_632_144_000, &intent)
            .unwrap();

        // Assert
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].from_call_type, FromCallType::Wallet);
        let protocol = match &result[0].protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => icrc1_transfer,
            _ => panic!("Expected Icrc1Transfer"),
        };
        assert_eq!(protocol.from, transfer_data.from);
        assert_eq!(protocol.to, transfer_data.to);
        assert_eq!(protocol.amount, transfer_data.amount);
    }

    #[test]
    fn it_should_succeed_convert_transfer_intent_to_canister_transactions_v3() {
        // Arrange
        let adapter = IcIntentAdapter;
        let transfer_data = TransferData {
            from: Wallet::new(random_principal_id()),
            to: Wallet::new(random_principal_id()),
            asset: Asset::default(),
            amount: Nat::from(130u64),
        };
        let intent = fixture_intent_v3(
            AddressTypeV3::Link,
            Some(IntentTransactionDataV3::Transfer(transfer_data.clone())),
        );

        // Act
        let result = adapter
            .intent_to_transactions_v3(Principal::anonymous(), 1_632_144_000, &intent)
            .unwrap();

        // Assert
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].from_call_type, FromCallType::Canister);
        let protocol = match &result[0].protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => icrc1_transfer,
            _ => panic!("Expected Icrc1Transfer"),
        };
        assert_eq!(protocol.from, transfer_data.from);
        assert_eq!(protocol.to, transfer_data.to);
        assert_eq!(protocol.amount, transfer_data.amount);
    }

    #[test]
    fn it_should_succeed_convert_transfer_from_intent_to_transactions_v3() {
        // Arrange
        let adapter = IcIntentAdapter;
        let transfer_from_data = TransferFromData {
            from: Wallet::new(random_principal_id()),
            to: Wallet::new(random_principal_id()),
            spender: Wallet::new(random_principal_id()),
            asset: Asset::default(),
            amount: Nat::from(200u64),
            actual_amount: Some(Nat::from(150u64)),
            approve_amount: Some(Nat::from(180u64)),
        };
        let intent = fixture_intent_v3(
            AddressTypeV3::Creator,
            Some(IntentTransactionDataV3::TransferFrom(transfer_from_data)),
        );

        // Act
        let result = adapter
            .intent_to_transactions_v3(Principal::anonymous(), 1_632_144_000, &intent)
            .unwrap();

        // Assert
        assert_eq!(result.len(), 2);
        assert!(matches!(
            result[0].protocol,
            Protocol::IC(IcTransaction::Icrc2Approve(_))
        ));
        assert!(matches!(
            result[1].protocol,
            Protocol::IC(IcTransaction::Icrc2TransferFrom(_))
        ));
    }
}
