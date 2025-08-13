// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::transaction_manager::traits::ActionUpdater;
use async_trait::async_trait;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        intent::v2::IntentTask,
        transaction::v2::{
            FromCallType, IcTransaction, Icrc1Transfer, Icrc2TransferFrom, Transaction,
            TransactionState,
        },
    },
};
use icrc_ledger_types::{icrc1::transfer::TransferArg, icrc2::transfer_from::TransferFromArgs};
use log::{error, info};

use crate::{
    services::transaction_manager::{
        service::TransactionManagerService, traits::TransactionExecutor,
    },
    utils::runtime::IcEnvironment,
};

#[async_trait(?Send)]
impl<E: IcEnvironment + Clone> TransactionExecutor<E> for TransactionManagerService<E> {
    /// Execute a transaction by ID
    ///
    /// Fetches transaction by ID and then executes it
    async fn execute_tx_by_id(&self, tx_id: String) -> Result<(), CanisterError> {
        let mut tx = self.transaction_service.get_tx_by_id(&tx_id)?;
        self.execute_canister_tx(&mut tx).await
    }

    /// Execute a canister transaction
    ///
    /// This handles the actual execution of a canister-initiated transaction
    async fn execute_canister_tx(&self, tx: &mut Transaction) -> Result<(), CanisterError> {
        if tx.from_call_type == FromCallType::Canister {
            // Check if dependencies are met
            let is_all_dependencies_success = self.is_all_depdendency_success(tx, true)?;

            if is_all_dependencies_success {
                let action_belong = self.action_service.get_action_by_tx_id(&tx.id)?;
                let (intent_belong, txs) = action_belong.get_intent_and_txs_by_its_tx_id(&tx.id)?;

                // Execute the transaction
                match self.execute_transaction(tx).await {
                    Ok(_) => {
                        self.update_tx_state(tx, &TransactionState::Success)
                            .map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error updating tx state: {e}"
                                ))
                            })?;

                        if intent_belong.task == IntentTask::TransferWalletToLink {
                            if txs.len() == 2 && tx.state == TransactionState::Success {
                                // Find the transaction that is not the current one
                                let other_tx = txs.iter().find(|t| t.id != tx.id);
                                if let Some(other_tx) = other_tx {
                                    let mut other_tx_clone = other_tx.clone();

                                    self.update_tx_state(
                                        &mut other_tx_clone,
                                        &TransactionState::Success,
                                    )
                                    .map_err(|e| {
                                        CanisterError::HandleLogicError(format!(
                                            "Error updating tx state: {e}"
                                        ))
                                    })?;
                                } else {
                                    error!(
                                        "[execute_canister_tx] Error: Could not find other transaction"
                                    );
                                    return Err(CanisterError::HandleLogicError(
                                        "Could not find other transaction".to_string(),
                                    ));
                                }
                            } else {
                                error!(
                                    "[execute_canister_tx] Error: Expected 2 transactions, found {}",
                                    txs.len()
                                );
                                return Err(CanisterError::HandleLogicError(
                                    "Invalid approve tx".to_string(),
                                ));
                            }
                        }
                    }
                    Err(e) => {
                        error!("[execute_canister_tx] Error executing tx: {:?}", e);
                        self.update_tx_state(tx, &TransactionState::Fail)
                            .map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error updating tx state: {e:?}"
                                ))
                            })?;
                        return Err(CanisterError::HandleLogicError(format!(
                            "Error executing tx: {e:?}"
                        )));
                    }
                };
            }
        } else {
            return Err(CanisterError::HandleLogicError(
                "Invalid from_call_type".to_string(),
            ));
        }

        Ok(())
    }

    async fn execute_icrc1_transfer(&self, tx: &Icrc1Transfer) -> Result<(), CanisterError> {
        let args: TransferArg =
            TransferArg::try_from(tx.clone()).map_err(CanisterError::HandleLogicError)?;

        // get asset
        let asset = tx
            .asset
            .get_principal()
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        self.icrc_service.transfer(asset, args).await?;

        Ok(())
    }

    async fn execute_icrc2_transfer_from(
        &self,
        tx: &Icrc2TransferFrom,
    ) -> Result<(), CanisterError> {
        let args: TransferFromArgs =
            TransferFromArgs::try_from(tx.clone()).map_err(CanisterError::HandleLogicError)?;

        // get asset
        let asset = tx
            .asset
            .get_principal()
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        self.icrc_service.transfer_from(asset, args).await?;

        Ok(())
    }
}

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    /// Execute a transaction using the ICRC service
    ///
    /// Core logic for transaction execution
    async fn execute_transaction(&self, transaction: &Transaction) -> Result<(), CanisterError> {
        let from_call_type = transaction.from_call_type.clone();

        match from_call_type {
            FromCallType::Canister => {
                let protocol = transaction.protocol.as_ic_transaction().ok_or_else(|| {
                    CanisterError::HandleLogicError("Unsupported transaction protocol".to_string())
                })?;

                match protocol {
                    // right now only for fee transfer
                    IcTransaction::Icrc2TransferFrom(tx) => {
                        info!(
                            "[execute_transaction] Executing ICRC2 transfer from: {:?}",
                            tx
                        );
                        self.execute_icrc2_transfer_from(tx).await
                    }
                    IcTransaction::Icrc1Transfer(tx) => self.execute_icrc1_transfer(tx).await,

                    _ => Err(CanisterError::HandleLogicError(
                        "Unsupported IcTransaction".to_string(),
                    )),
                }
            }
            FromCallType::Wallet => Err(CanisterError::HandleLogicError(
                "Unsupported from_call_type".to_string(),
            )),
        }
    }
}
