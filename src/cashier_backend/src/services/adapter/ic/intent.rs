// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use cashier_types::{
    FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent,
    IntentTask, IntentType, Protocol, Transaction, TransactionState, TransferData,
    TransferFromData,
};
use uuid::Uuid;

use crate::{
    services::adapter::IntentAdapter,
    types::error::CanisterError,
    utils::{helper::to_memo, runtime::IcEnvironment},
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

        let icrc2_approve = Icrc2Approve {
            from: transfer_intent.from.clone(),
            spender: transfer_intent.spender.clone(),
            asset: transfer_intent.asset.clone(),
            amount: approve_amount,
            memo: Some(to_memo(&approve_id.to_string())),
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
            amount: transfer_from_amount,
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
    fn intent_to_transactions(&self, intent: &Intent) -> Result<Vec<Transaction>, CanisterError> {
        match (intent.task.clone(), intent.r#type.clone()) {
            (IntentTask::TransferWalletToLink, IntentType::Transfer(transfer_intent)) => {
                self.assemble_icrc1_wallet_transfer(transfer_intent)
            }
            (IntentTask::TransferWalletToTreasury, IntentType::TransferFrom(transfer_intent)) => {
                self.assemble_icrc2_wallet_transfer(transfer_intent)
            }
            (IntentTask::TransferLinkToWallet, IntentType::Transfer(transfer_intent)) => {
                self.assemble_icrc1_canister_transfer(transfer_intent)
            }
            _ => {
                return Err(CanisterError::InvalidInput(
                    "Unsupported intent task or type".to_string(),
                ));
            }
        }
    }
}
