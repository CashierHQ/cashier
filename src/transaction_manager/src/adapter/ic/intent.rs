// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::adapter::IntentAdapterTrait;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        intent::v1::{IntentTask, IntentType, TransferData, TransferFromData},
        intent::v2::Intent,
        transaction::v1::{
            FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Protocol,
            Transaction, TransactionState,
        },
    },
};
use cashier_common::utils::to_memo;
use uuid::Uuid;

#[derive(Clone, Default)]
pub struct IcIntentAdapter;

impl IcIntentAdapter {
    /// Assembles ICRC1 wallet transfer transactions from the given transfer intent.
    /// # Arguments
    /// * `ts` - The timestamp for the transaction.
    /// * `transfer_intent` - The transfer intent containing transfer details.
    /// # Returns
    /// * `Result<Vec<Transaction>, CanisterError>` - A vector of assembled transactions or an error.
    fn assemble_icrc1_wallet_transfer(
        &self,
        ts: u64,
        transfer_intent: TransferData,
    ) -> Result<Vec<Transaction>, CanisterError> {
        let id: Uuid = Uuid::new_v4();

        let memo = to_memo(&id.to_string())?;

        let icrc1_transfer = Icrc1Transfer {
            from: transfer_intent.from,
            to: transfer_intent.to,
            asset: transfer_intent.asset,
            amount: transfer_intent.amount,
            ts: Some(ts),
            memo: Some(memo),
        };

        let ic_transaction = IcTransaction::Icrc1Transfer(icrc1_transfer);

        let transaction = Transaction {
            id: id.to_string(),
            created_at: ts,
            state: TransactionState::Created,
            dependency: None,
            protocol: Protocol::IC(ic_transaction),
            group: 1,
            from_call_type: FromCallType::Wallet,
            start_ts: None,
        };

        Ok(vec![transaction])
    }

    /// Assembles ICRC2 wallet transfer transactions from the given transfer intent.
    /// # Arguments
    /// * `ts` - The timestamp for the transaction.
    /// * `transfer_intent` - The transfer intent containing transfer details.
    /// # Returns
    /// * `Result<Vec<Transaction>, CanisterError>` - A vector of assembled transactions or an error.
    fn assemble_icrc2_wallet_transfer(
        &self,
        ts: u64,
        transfer_intent: TransferFromData,
    ) -> Result<Vec<Transaction>, CanisterError> {
        let approve_id = Uuid::new_v4();

        let approve_amount = transfer_intent
            .approve_amount
            .ok_or_else(|| CanisterError::InvalidInput("approve_amount not found".to_string()))?;

        let transfer_from_amount = transfer_intent.actual_amount.ok_or_else(|| {
            CanisterError::InvalidInput("transfer_from_amount not found".to_string())
        })?;

        if approve_amount < transfer_from_amount {
            return Err(CanisterError::InvalidInput(
                "approve_amount must be greater than or equal to transfer_from_amount".to_string(),
            ));
        }

        if transfer_from_amount > transfer_intent.amount {
            return Err(CanisterError::InvalidInput(
                "transfer_from_amount must be less than or equal to amount".to_string(),
            ));
        }

        let memo = to_memo(&approve_id.to_string())?;

        let icrc2_approve = Icrc2Approve {
            from: transfer_intent.from.clone(),
            spender: transfer_intent.spender.clone(),
            asset: transfer_intent.asset.clone(),
            amount: approve_amount,
            memo: Some(memo),
            ts: Some(ts),
        };

        let ic_approve_tx = IcTransaction::Icrc2Approve(icrc2_approve);
        let approve_tx: Transaction = Transaction {
            id: approve_id.to_string(),
            created_at: ts,
            state: TransactionState::Created,
            dependency: None,
            protocol: Protocol::IC(ic_approve_tx),
            group: 1,
            from_call_type: FromCallType::Wallet,
            start_ts: None,
        };

        let transfer_id = Uuid::new_v4();
        let transfer_memo = to_memo(&transfer_id.to_string())?;
        let icrc2_transfer_from = Icrc2TransferFrom {
            from: transfer_intent.from,
            to: transfer_intent.to,
            spender: transfer_intent.spender,
            asset: transfer_intent.asset,
            amount: transfer_from_amount,
            ts: Some(ts),
            memo: Some(transfer_memo),
        };
        let ic_transfer_from_tx = IcTransaction::Icrc2TransferFrom(icrc2_transfer_from);
        let transfer_from_tx = Transaction {
            id: transfer_id.to_string(),
            created_at: ts,
            state: TransactionState::Created,
            dependency: Some(vec![approve_tx.id.clone()]),
            protocol: Protocol::IC(ic_transfer_from_tx),
            group: 1,
            from_call_type: FromCallType::Canister,
            start_ts: None,
        };

        Ok(vec![approve_tx, transfer_from_tx])
    }

    /// Assembles ICRC1 canister transfer transactions from the given transfer intent.
    /// # Arguments
    /// * `ts` - The timestamp for the transaction.
    /// * `transfer_intent` - The transfer intent containing transfer details.
    /// # Returns
    /// * `Result<Vec<Transaction>, CanisterError>` - A vector of assembled transactions or an error.
    fn assemble_icrc1_canister_transfer(
        &self,
        ts: u64,
        transfer_intent: TransferData,
    ) -> Result<Vec<Transaction>, CanisterError> {
        let id: Uuid = Uuid::new_v4();

        let memo = to_memo(&id.to_string())?;

        let icrc1_transfer = Icrc1Transfer {
            from: transfer_intent.from,
            to: transfer_intent.to,
            asset: transfer_intent.asset,
            amount: transfer_intent.amount,
            ts: Some(ts),
            memo: Some(memo),
        };

        let ic_transaction = IcTransaction::Icrc1Transfer(icrc1_transfer);
        let transfer_from_tx = Transaction {
            id: id.to_string(),
            created_at: ts,
            state: TransactionState::Created,
            dependency: None,
            protocol: Protocol::IC(ic_transaction),
            group: 1,
            from_call_type: FromCallType::Canister,
            start_ts: None,
        };

        Ok(vec![transfer_from_tx])
    }
}

impl IntentAdapterTrait for IcIntentAdapter {
    fn intent_to_transactions(
        &self,
        ts: u64,
        intent: &Intent,
    ) -> Result<Vec<Transaction>, CanisterError> {
        match (intent.task.clone(), intent.r#type.clone()) {
            (IntentTask::TransferWalletToLink, IntentType::Transfer(transfer_intent)) => {
                self.assemble_icrc1_wallet_transfer(ts, transfer_intent)
            }
            (IntentTask::TransferWalletToTreasury, IntentType::TransferFrom(transfer_intent)) => {
                self.assemble_icrc2_wallet_transfer(ts, transfer_intent)
            }
            (IntentTask::TransferLinkToWallet, IntentType::Transfer(transfer_intent)) => {
                self.assemble_icrc1_canister_transfer(ts, transfer_intent)
            }
            _ => Err(CanisterError::InvalidInput(
                "Unsupported intent task or type".to_string(),
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::{
        common::{Asset, Wallet},
        intent::v1::IntentState,
    };
    use cashier_common::{
        chain::Chain,
        test_utils::{random_id_string, random_principal_id},
    };

    #[test]
    fn test_assemble_icrc1_wallet_transfer() {
        // Arrange
        let adapter = IcIntentAdapter;
        let ts = 1_632_144_000; // Example timestamp
        let from = Wallet::new(random_principal_id());
        let to = Wallet::new(random_principal_id());
        let asset = Asset::default();
        let amount = Nat::from(100_000u64);

        let transfer_intent = TransferData {
            from,
            to,
            asset,
            amount: amount.clone(),
        };

        // Act
        let result = adapter
            .assemble_icrc1_wallet_transfer(ts, transfer_intent.clone())
            .unwrap();

        // Assert
        assert_eq!(result.len(), 1);
        let tx = &result[0];
        assert_eq!(tx.created_at, ts);
        assert_eq!(tx.state, TransactionState::Created);
        let protocol = match &tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => icrc1_transfer,
            _ => panic!("Expected Icrc1Transfer"),
        };
        assert_eq!(protocol.amount, amount);
        assert_eq!(protocol.from, transfer_intent.from);
        assert_eq!(protocol.to, transfer_intent.to);
    }

    #[test]
    fn test_assemble_icrc2_wallet_transfer() {
        // Arrange
        let adapter = IcIntentAdapter;
        let ts = 1_632_144_000; // Example timestamp
        let from = Wallet::new(random_principal_id());
        let to = Wallet::new(random_principal_id());
        let spender = Wallet::new(random_principal_id());
        let asset = Asset::default();
        let amount = Nat::from(200_000u64);
        let approve_amount = Nat::from(150_000u64);
        let actual_amount = Nat::from(100_000u64);

        let transfer_intent = TransferFromData {
            from,
            to,
            spender,
            asset,
            amount: amount.clone(),
            approve_amount: Some(approve_amount.clone()),
            actual_amount: Some(actual_amount.clone()),
        };

        // Act
        let result = adapter
            .assemble_icrc2_wallet_transfer(ts, transfer_intent.clone())
            .unwrap();

        // Assert
        assert_eq!(result.len(), 2);
        let approve_tx = &result[0];
        assert_eq!(approve_tx.created_at, ts);
        assert_eq!(approve_tx.state, TransactionState::Created);
        let approve_protocol = match &approve_tx.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => icrc2_approve,
            _ => panic!("Expected Icrc2Approve"),
        };
        assert_eq!(approve_protocol.amount, approve_amount);
        assert_eq!(approve_protocol.from, transfer_intent.from);
        assert_eq!(approve_protocol.spender, transfer_intent.spender);

        let transfer_from_tx = &result[1];
        assert_eq!(transfer_from_tx.created_at, ts);
        assert_eq!(transfer_from_tx.state, TransactionState::Created);
        let transfer_from_protocol = match &transfer_from_tx.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from
            }
            _ => panic!("Expected Icrc2TransferFrom"),
        };
        assert_eq!(transfer_from_protocol.amount, actual_amount);
        assert_eq!(transfer_from_protocol.from, transfer_intent.from);
        assert_eq!(transfer_from_protocol.to, transfer_intent.to);
        assert_eq!(transfer_from_protocol.spender, transfer_intent.spender);
    }

    #[test]
    fn test_assemble_icrc1_canister_transfer() {
        // Arrange
        let adapter = IcIntentAdapter;
        let ts = 1_632_144_000; // Example timestamp
        let from = Wallet::new(random_principal_id());
        let to = Wallet::new(random_principal_id());
        let asset = Asset::default();
        let amount = Nat::from(100_000u64);
        let transfer_intent = TransferData {
            from,
            to,
            asset,
            amount: amount.clone(),
        };

        // Act
        let result = adapter
            .assemble_icrc1_canister_transfer(ts, transfer_intent.clone())
            .unwrap();

        // Assert
        assert_eq!(result.len(), 1);
        let tx = &result[0];
        assert_eq!(tx.created_at, ts);
        assert_eq!(tx.state, TransactionState::Created);
        let protocol = match &tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => icrc1_transfer,
            _ => panic!("Expected Icrc1Transfer"),
        };
        assert_eq!(protocol.amount, amount);
        assert_eq!(protocol.from, transfer_intent.from);
        assert_eq!(protocol.to, transfer_intent.to);
    }

    #[test]
    fn test_intent_to_transactions_transfer_wallet_to_link() {
        // Arrange
        let adapter = IcIntentAdapter;
        let ts = 1_632_144_000; // Example timestamp
        let from = Wallet::new(random_principal_id());
        let to = Wallet::new(random_principal_id());
        let asset = Asset::default();
        let amount = Nat::from(100_000u64);

        let transfer_intent = TransferData {
            from,
            to,
            asset,
            amount: amount.clone(),
        };

        let intent_id = random_id_string();
        let intent = Intent {
            id: intent_id,
            created_at: ts,
            task: IntentTask::TransferWalletToLink,
            r#type: IntentType::Transfer(transfer_intent.clone()),
            state: IntentState::Created,
            dependency: vec![],
            chain: Chain::IC,
            label: "Test Intent".to_string(),
            intent_total_amount: None,
            intent_total_network_fee: None,
            intent_user_fee: None,
        };

        // Act
        let result = adapter.intent_to_transactions(ts, &intent).unwrap();

        // Assert
        assert_eq!(result.len(), 1);
        let tx = &result[0];
        assert_eq!(tx.created_at, ts);
        assert_eq!(tx.state, TransactionState::Created);
        let protocol = match &tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => icrc1_transfer,
            _ => panic!("Expected Icrc1Transfer"),
        };
        assert_eq!(protocol.amount, amount);
        assert_eq!(protocol.from, transfer_intent.from);
        assert_eq!(protocol.to, transfer_intent.to);
    }

    #[test]
    fn test_intent_to_transactions_transfer_wallet_to_treasury() {
        // Arrange
        let adapter = IcIntentAdapter;
        let ts = 1_632_144_000; // Example timestamp
        let from = Wallet::new(random_principal_id());
        let to = Wallet::new(random_principal_id());
        let spender = Wallet::new(random_principal_id());
        let asset = Asset::default();
        let amount = Nat::from(200_000u64);
        let approve_amount = Nat::from(150_000u64);
        let actual_amount = Nat::from(100_000u64);

        let transfer_intent = TransferFromData {
            from,
            to,
            spender,
            asset,
            amount: amount.clone(),
            approve_amount: Some(approve_amount.clone()),
            actual_amount: Some(actual_amount.clone()),
        };

        let intent_id = random_id_string();
        let intent = Intent {
            id: intent_id,
            created_at: ts,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::TransferFrom(transfer_intent.clone()),
            state: IntentState::Created,
            dependency: vec![],
            chain: Chain::IC,
            label: "Test Intent".to_string(),
            intent_total_amount: None,
            intent_total_network_fee: None,
            intent_user_fee: None,
        };

        // Act
        let result = adapter.intent_to_transactions(ts, &intent).unwrap();

        // Assert
        assert_eq!(result.len(), 2);
        let approve_tx = &result[0];
        assert_eq!(approve_tx.created_at, ts);
        assert_eq!(approve_tx.state, TransactionState::Created);
        let approve_protocol = match &approve_tx.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => icrc2_approve,
            _ => panic!("Expected Icrc2Approve"),
        };
        assert_eq!(approve_protocol.amount, approve_amount);
        assert_eq!(approve_protocol.from, transfer_intent.from);
        assert_eq!(approve_protocol.spender, transfer_intent.spender);

        let transfer_from_tx = &result[1];
        assert_eq!(transfer_from_tx.created_at, ts);
        assert_eq!(transfer_from_tx.state, TransactionState::Created);
        let transfer_from_protocol = match &transfer_from_tx.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from
            }
            _ => panic!("Expected Icrc2TransferFrom"),
        };
        assert_eq!(transfer_from_protocol.amount, actual_amount);
        assert_eq!(transfer_from_protocol.from, transfer_intent.from);
        assert_eq!(transfer_from_protocol.to, transfer_intent.to);
        assert_eq!(transfer_from_protocol.spender, transfer_intent.spender);
    }

    #[test]
    fn test_intent_to_transactions_transfer_link_to_wallet() {
        // Arrange
        let adapter = IcIntentAdapter;
        let ts = 1_632_144_000; // Example timestamp
        let from = Wallet::new(random_principal_id());
        let to = Wallet::new(random_principal_id());
        let asset = Asset::default();
        let amount = Nat::from(100_000u64);
        let transfer_intent = TransferData {
            from,
            to,
            asset,
            amount: amount.clone(),
        };
        let intent_id = random_id_string();
        let intent = Intent {
            id: intent_id,
            created_at: ts,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(transfer_intent.clone()),
            state: IntentState::Created,
            dependency: vec![],
            chain: Chain::IC,
            label: "Test Intent".to_string(),
            intent_total_amount: None,
            intent_total_network_fee: None,
            intent_user_fee: None,
        };

        // Act
        let result = adapter.intent_to_transactions(ts, &intent).unwrap();

        // Assert
        assert_eq!(result.len(), 1);
        let tx = &result[0];
        assert_eq!(tx.created_at, ts);
        assert_eq!(tx.state, TransactionState::Created);
        let protocol = match &tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => icrc1_transfer,
            _ => panic!("Expected Icrc1Transfer"),
        };
        assert_eq!(protocol.amount, amount);
        assert_eq!(protocol.from, transfer_intent.from);
        assert_eq!(protocol.to, transfer_intent.to);
    }
}
