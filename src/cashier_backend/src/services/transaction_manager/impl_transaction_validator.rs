// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repositories::Repositories,
    services::transaction_manager::{
        service::TransactionManagerService, traits::TransactionValidator,
    },
};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::Asset,
        transaction::v2::{
            IcTransaction, Icrc1Transfer, Icrc2Approve, Protocol, Transaction, TransactionState,
        },
    },
};
use cashier_common::runtime::IcEnvironment;
use log::{error, warn};

impl<E: IcEnvironment + Clone, R: Repositories> TransactionValidator<E>
    for TransactionManagerService<E, R>
{
    async fn validate_balance_transfer(
        &self,
        icrc1_transfer_info: &Icrc1Transfer,
    ) -> Result<bool, CanisterError> {
        let target = icrc1_transfer_info.to.clone();
        let target_account = target.get_account();

        let asset = match icrc1_transfer_info.asset {
            Asset::IC { address } => address,
        };

        let balance = self.icrc_service.balance_of(asset, target_account).await?;

        if balance < icrc1_transfer_info.amount {
            return Ok(false);
        }

        Ok(true)
    }

    async fn validate_allowance(
        &self,
        icrc2_transfer_from_info: &Icrc2Approve,
    ) -> Result<bool, CanisterError> {
        let from_wallet_account = icrc2_transfer_from_info.from.get_account();

        let spender_account = icrc2_transfer_from_info.spender.get_account();

        let allowance_amount = icrc2_transfer_from_info.amount.clone();

        let asset = match icrc2_transfer_from_info.asset {
            Asset::IC { address } => address,
        };

        let allowance_fee = self
            .icrc_service
            .allowance(asset, from_wallet_account, spender_account)
            .await?;

        if allowance_fee.allowance < allowance_amount {
            return Ok(false);
        }

        Ok(true)
    }

    async fn manual_check_status(
        &self,
        transaction: &Transaction,
        txs: Vec<Transaction>,
    ) -> TransactionState {
        // If the transaction is not in Processing state, return its current state
        if transaction.state != TransactionState::Processing {
            return transaction.state.clone();
        }

        // Check the protocol type
        match &transaction.protocol {
            // Check balance for Icrc1Transfer
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer_info)) => {
                let is_valid = self.validate_balance_transfer(icrc1_transfer_info).await;

                match is_valid {
                    Ok(valid) => {
                        if valid {
                            TransactionState::Success
                        } else {
                            warn!(
                                "[manual_check_status] Icrc1Transfer failed: Insufficient balance for transfer {:?}",
                                transaction
                            );
                            TransactionState::Fail
                        }
                    }
                    Err(e) => {
                        error!(
                            "[manual_check_status] Icrc1Transfer error tx: {transaction:?} - error: {e:?}"
                        );
                        TransactionState::Fail
                    }
                }
            }
            // Check allowance for Icrc2Approve
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve_info)) => {
                let txs_depended = txs
                    .iter()
                    .filter(|tx| {
                        let has_depended = tx
                            .dependency
                            .iter()
                            .any(|dep| dep.contains(&transaction.id.to_string()));

                        let is_icrc2_transfer_from = tx
                            .protocol
                            .as_ic_transaction()
                            .map(|tx| matches!(tx, IcTransaction::Icrc2TransferFrom(_)))
                            .unwrap_or(false);

                        has_depended && is_icrc2_transfer_from
                    })
                    .collect::<Vec<_>>();

                if !txs_depended.is_empty() {
                    let is_all_success = txs_depended
                        .iter()
                        .all(|tx| tx.state == TransactionState::Success);
                    if is_all_success {
                        return TransactionState::Success;
                    }
                }

                let is_valid = self.validate_allowance(icrc2_approve_info).await;

                if let Ok(valid) = is_valid {
                    if valid {
                        TransactionState::Success
                    } else {
                        warn!(
                            "[manual_check_status] Icrc2Approve failed: Insufficient allowance for transfer {:?}",
                            transaction
                        );
                        TransactionState::Fail
                    }
                } else {
                    TransactionState::Fail
                }
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(_)) => {
                warn!("[manual_check_status] Icrc2TransferFrom failed: Transaction timed out");
                TransactionState::Fail
            }
        }
    }

    fn is_action_creator(&self, caller: &Principal, action_id: &str) -> Result<bool, String> {
        let action = self.action_repository.get(action_id);
        match action {
            Some(action) => Ok(&action.creator == caller),
            None => Err("Action not found".to_string()),
        }
    }
}
