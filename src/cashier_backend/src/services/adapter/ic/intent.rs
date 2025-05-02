use cashier_types::{
    FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent,
    IntentTask, IntentType, Protocol, Transaction, TransactionState, TransferData,
    TransferFromData,
};
use uuid::Uuid;

use crate::{
    services::adapter::IntentAdapter, types::error::CanisterError, utils::runtime::IcEnvironment,
    utils::helper::to_memo,
};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct IcIntentAdapter<E: IcEnvironment + Clone> {
    pub ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<'a, E: IcEnvironment + Clone> IcIntentAdapter<E> {
    pub fn new() -> Self {
        Self { ic_env: E::new() }
    }

    fn assemble_icrc1_wallet_transfer(
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
            memo: Some(to_memo(&id.to_string())),
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
        transfer_intent: TransferFromData,
    ) -> Result<Vec<Transaction>, CanisterError> {
        let ts = self.ic_env.time();
        let approve_id = Uuid::new_v4();

        let icrc2_approve = Icrc2Approve {
            from: transfer_intent.from.clone(),
            spender: transfer_intent.spender.clone(),
            asset: transfer_intent.asset.clone(),
            amount: transfer_intent.amount,
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
        let icrc2_transfer_from = Icrc2TransferFrom {
            from: transfer_intent.from,
            to: transfer_intent.to,
            spender: transfer_intent.spender,
            asset: transfer_intent.asset,
            amount: transfer_intent.amount,
            ts: Some(ts),
            memo: Some(to_memo(&transfer_id.to_string())),
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
            memo: Some(to_memo(&id.to_string())),
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

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> IntentAdapter for IcIntentAdapter<E> {
    fn intent_to_transactions(&self, intent: &Intent) -> Result<Vec<Transaction>, String> {
        match (intent.r#type.clone(), intent.task.clone()) {
            (IntentType::Transfer(transfer_intent), IntentTask::TransferWalletToLink) => self
                .assemble_icrc1_wallet_transfer(transfer_intent)
                .map_err(|e| e.to_string()),
            (IntentType::TransferFrom(transfer_intent), IntentTask::TransferWalletToTreasury) => {
                self.assemble_icrc2_wallet_transfer(transfer_intent)
                    .map_err(|e| e.to_string())
            }
            (IntentType::Transfer(transfer_intent), IntentTask::TransferLinkToWallet) => self
                .assemble_icrc1_canister_transfer(transfer_intent)
                .map_err(|e| e.to_string()),
            (IntentType::Transfer(transfer_intent), IntentTask::TransferPayment) => self
                .assemble_icrc1_canister_transfer(transfer_intent)
                .map_err(|e| e.to_string()),
            _ => Err(format!(
                "Invalid intent type and task combination: {:?}, {:?}",
                intent.r#type, intent.task
            )),
        }
    }
}
