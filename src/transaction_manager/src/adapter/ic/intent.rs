// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::adapter::IntentAdapter;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        intent::v1::{Intent, IntentTask, IntentType, TransferData, TransferFromData},
        transaction::v1::{
            FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Protocol,
            Transaction, TransactionState,
        },
    },
};
use cashier_common::utils::to_memo;
use uuid::Uuid;

#[derive(Clone)]
pub struct IcIntentAdapter;

impl IcIntentAdapter {
    pub fn new() -> Self {
        Self {}
    }

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

impl IntentAdapter for IcIntentAdapter {
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
