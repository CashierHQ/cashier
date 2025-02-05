use cashier_types::{
    Chain, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent, IntentTask,
    IntentType, Protocol, Transaction, TransactionState, TransactionWallet, TransferFromIntent,
    TransferIntent,
};
use uuid::Uuid;

use super::IntentAdapter;

pub struct IcAdapter {}

impl IcAdapter {
    pub fn convert(intent: &Intent) -> Result<Vec<Transaction>, String> {
        match (intent.r#type.clone(), intent.task.clone()) {
            (IntentType::Transfer(transfer_intent), IntentTask::TransferWalletToLink) => {
                Self::handle_transfer_wallet_to_link(transfer_intent)
            }
            (IntentType::TransferFrom(transfer_intent), IntentTask::TransferWalletToTreasury) => {
                Self::handle_transfer_wallet_to_treasury(transfer_intent)
            }
            // Add other combinations as needed
            _ => Err("Unsupported intent type or task".to_string()),
        }
    }

    fn handle_transfer_wallet_to_link(
        transfer_intent: TransferIntent,
    ) -> Result<Vec<Transaction>, String> {
        let id: Uuid = Uuid::new_v4();
        let ts = ic_cdk::api::time();

        let icrc1_transfer = Icrc1Transfer {
            from: transfer_intent.from,
            to: transfer_intent.to,
            asset: transfer_intent.asset,
            amount: transfer_intent.amount,
            ts: Some(ts),
            //TODO: update memo
            memo: None,
        };

        let ic_transaction = IcTransaction::Icrc1Transfer(icrc1_transfer);

        let transaction = Transaction {
            id: id.to_string(),
            created_at: ts,
            state: TransactionState::Created,
            dependency: None,
            grouping: None,
            wallet: TransactionWallet::User,
            protocol: Protocol::IC(ic_transaction),
            timeout: None,
        };

        Ok(vec![transaction])
    }

    fn handle_transfer_wallet_to_treasury(
        transfer_intent: TransferFromIntent,
    ) -> Result<Vec<Transaction>, String> {
        let ts = ic_cdk::api::time();

        let icrc2_approve = Icrc2Approve {
            from: transfer_intent.from.clone(),
            spender: transfer_intent.spender.clone(),
            asset: transfer_intent.asset.clone(),
            amount: transfer_intent.amount,
        };

        let ic_approve_tx = IcTransaction::Icrc2Approve(icrc2_approve);
        let approve_tx: Transaction = Transaction {
            id: Uuid::new_v4().to_string(),
            created_at: ts,
            state: TransactionState::Created,
            dependency: None,
            grouping: None,
            wallet: TransactionWallet::User,
            protocol: Protocol::IC(ic_approve_tx),
            timeout: None,
        };

        let icrc2_transfer_from = Icrc2TransferFrom {
            from: transfer_intent.from,
            to: transfer_intent.to,
            spender: transfer_intent.spender,
            asset: transfer_intent.asset,
            amount: transfer_intent.amount,
            ts: Some(ts),
            //TODO: update memo
            memo: None,
        };
        let ic_transfer_from_tx = IcTransaction::Icrc2TransferFrom(icrc2_transfer_from);
        let transfer_from_tx = Transaction {
            id: Uuid::new_v4().to_string(),
            created_at: ts,
            state: TransactionState::Created,
            dependency: Some(vec![approve_tx.id.clone()]),
            grouping: None,
            wallet: TransactionWallet::User,
            protocol: Protocol::IC(ic_transfer_from_tx),
            timeout: None,
        };

        Ok(vec![approve_tx, transfer_from_tx])
    }
}

impl IntentAdapter for IcAdapter {
    fn convert_to_transaction(&self, intent: Intent) -> Result<Vec<Transaction>, String> {
        if intent.chain != Chain::IC {
            return Err("Invalid chain".to_string());
        }

        Self::convert(&intent)
    }
}
