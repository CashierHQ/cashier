use cashier_types::{
    FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent,
    IntentTask, IntentType, Protocol, Transaction, TransactionState, TransferData,
    TransferFromData,
};
use uuid::Uuid;

use crate::{types::error::CanisterError, utils::runtime::IcEnvironment};

pub struct IcAdapter<'a, E: IcEnvironment + Clone> {
    pub ic_env: &'a E,
}

impl<'a, E: IcEnvironment + Clone> IcAdapter<'a, E> {
    pub fn new(ic_env: &'a E) -> Self {
        Self { ic_env }
    }
    pub fn convert(&self, intent: &Intent) -> Result<Vec<Transaction>, CanisterError> {
        match (intent.r#type.clone(), intent.task.clone()) {
            (IntentType::Transfer(transfer_intent), IntentTask::TransferWalletToLink) => {
                self.tx_man_ic_assemble_icrc1_wallet_transfer(transfer_intent)
            }
            (IntentType::TransferFrom(transfer_intent), IntentTask::TransferWalletToTreasury) => {
                self.tx_man_ic_assemble_icrc2_wallet_transfer(transfer_intent)
            }
            (IntentType::Transfer(transfer_intent), IntentTask::TransferLinkToWallet) => {
                self.tx_man_ic_assemble_icrc1_canister_transfer(transfer_intent)
            }
            // Add other combinations as needed
            _ => Err(CanisterError::ValidationErrors(
                "Invalid intent type and task combination".to_string(),
            )),
        }
    }

    pub fn tx_man_ic_assemble_icrc1_wallet_transfer(
        &self,
        transfer_intent: TransferData,
    ) -> Result<Vec<Transaction>, CanisterError> {
        let id: Uuid = Uuid::new_v4();
        let ts = self.ic_env.time();

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
            protocol: Protocol::IC(ic_transaction),
            group: 1,
            from_call_type: FromCallType::Wallet,
            start_ts: None,
        };

        Ok(vec![transaction])
    }

    pub fn tx_man_ic_assemble_icrc2_wallet_transfer(
        &self,
        transfer_intent: TransferFromData,
    ) -> Result<Vec<Transaction>, CanisterError> {
        let ts = self.ic_env.time();

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
            protocol: Protocol::IC(ic_approve_tx),
            group: 1,
            from_call_type: FromCallType::Wallet,
            start_ts: None,
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
            protocol: Protocol::IC(ic_transfer_from_tx),
            group: 1,
            from_call_type: FromCallType::Canister,
            start_ts: None,
        };

        Ok(vec![approve_tx, transfer_from_tx])
    }

    pub fn tx_man_ic_assemble_icrc1_canister_transfer(
        &self,
        transfer_intent: TransferData,
    ) -> Result<Vec<Transaction>, CanisterError> {
        let ts = self.ic_env.time();

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
        let transfer_from_tx = Transaction {
            id: Uuid::new_v4().to_string(),
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
