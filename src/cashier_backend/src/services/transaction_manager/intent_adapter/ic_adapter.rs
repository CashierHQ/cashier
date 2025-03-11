use cashier_types::{
    Chain, FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent,
    IntentTask, IntentType, Protocol, Transaction, TransactionState, TransferData,
    TransferFromData,
};
use uuid::Uuid;

use crate::utils::runtime::IcEnvironment;

use super::IntentAdapter;

pub struct IcAdapter<'a, E: IcEnvironment + Clone> {
    pub ic_env: &'a E,
}

impl<'a, E: IcEnvironment + Clone> IcAdapter<'a, E> {
    pub fn new(ic_env: &'a E) -> Self {
        Self { ic_env }
    }
    pub fn convert(&self, intent: &Intent) -> Result<Vec<Transaction>, String> {
        match (intent.r#type.clone(), intent.task.clone()) {
            (IntentType::Transfer(transfer_intent), IntentTask::TransferWalletToLink) => {
                self.handle_transfer_wallet_to_link(transfer_intent)
            }
            (IntentType::TransferFrom(transfer_intent), IntentTask::TransferWalletToTreasury) => {
                self.handle_transfer_wallet_to_treasury(transfer_intent)
            }
            (IntentType::Transfer(transfer_intent), IntentTask::TransferLinkToWallet) => {
                self.handle_transfer_link_to_wallet(transfer_intent)
            }
            // Add other combinations as needed
            _ => Err(format!(
                "Unsupported intent type or task {:#?} {:#?}",
                intent.r#type.clone(),
                intent.task.clone()
            )
            .to_string()),
        }
    }

    fn handle_transfer_wallet_to_link(
        &self,
        transfer_intent: TransferData,
    ) -> Result<Vec<Transaction>, String> {
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

    fn handle_transfer_wallet_to_treasury(
        &self,
        transfer_intent: TransferFromData,
    ) -> Result<Vec<Transaction>, String> {
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

    fn handle_transfer_link_to_wallet(
        &self,
        transfer_intent: TransferData,
    ) -> Result<Vec<Transaction>, String> {
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

impl<'a, E: IcEnvironment + Clone> IntentAdapter for IcAdapter<'a, E> {
    fn convert_to_transaction(&self, intent: Intent) -> Result<Vec<Transaction>, String> {
        if intent.chain != Chain::IC {
            return Err("Invalid chain".to_string());
        }

        self.convert(&intent)
    }
}
