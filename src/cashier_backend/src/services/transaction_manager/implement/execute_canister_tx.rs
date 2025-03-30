// src/cashier_backend/src/services/transaction_manager/tx_execution_impl.rs

use candid::Nat;
use cashier_types::{
    FromCallType, IcTransaction, Icrc1Transfer, Icrc2TransferFrom, Transaction, TransactionState,
};
use icrc_ledger_types::{icrc1::transfer::TransferArg, icrc2::transfer_from::TransferFromArgs};

use crate::{
    services::transaction_manager::TransactionManagerService, types::error::CanisterError,
    utils::runtime::IcEnvironment,
};

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    /// Execute a transaction by ID
    ///
    /// Fetches transaction by ID and then executes it
    pub async fn execute_tx_by_id(&self, tx_id: String) -> Result<(), CanisterError> {
        let mut tx = self.transaction_service.get_tx_by_id(&tx_id)?;
        self.execute_canister_tx(&mut tx).await
    }

    /// Execute a canister transaction
    ///
    /// This handles the actual execution of a canister-initiated transaction
    pub async fn execute_canister_tx(&self, tx: &mut Transaction) -> Result<(), CanisterError> {
        if tx.from_call_type == cashier_types::FromCallType::Canister {
            // Check if dependencies are met
            let is_all_dependencies_success = self.is_all_depdendency_success(&tx, true)?;

            if is_all_dependencies_success {
                // Execute the transaction
                match self.execute_transaction(tx).await {
                    Ok(_) => {
                        self.update_tx_state(tx, &TransactionState::Success)
                            .map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error updating tx state: {}",
                                    e
                                ))
                            })?;
                    }
                    Err(e) => {
                        self.update_tx_state(tx, &TransactionState::Fail)
                            .map_err(|e| {
                                CanisterError::HandleLogicError(format!(
                                    "Error updating tx state: {}",
                                    e
                                ))
                            })?;
                        return Err(CanisterError::HandleLogicError(format!(
                            "Error executing tx: {}",
                            e
                        )));
                    }
                }
            }
        } else {
            return Err(CanisterError::HandleLogicError(
                "Invalid from_call_type".to_string(),
            ));
        }

        return Ok(());
    }

    pub async fn execute_icrc2_transfer_from(
        &self,
        tx: &Icrc2TransferFrom,
    ) -> Result<(), CanisterError> {
        let mut args: TransferFromArgs = TransferFromArgs::try_from(tx.clone())
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        // get asset
        let asset = tx
            .asset
            .get_principal()
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        let transfer_amount = u128::try_from(args.amount.clone().0);
        match transfer_amount {
            Ok(amount) => {
                let amount_subtract_fee = {
                    let token_fee = self.icrc_service.fee(asset).await?;
                    amount.checked_sub(token_fee as u128)
                };
                match amount_subtract_fee {
                    Some(amount_subtract_fee) => args.amount = Nat::from(amount_subtract_fee),
                    None => {
                        return Err(CanisterError::HandleLogicError(
                            "Failed to calculate fee".to_string(),
                        ));
                    }
                }
            }

            Err(_) => {
                return Err(CanisterError::HandleLogicError(
                    "Failed to convert fee to u128".to_string(),
                ));
            }
        }

        self.icrc_service.transfer_from(asset, args).await?;

        return Ok(());
    }

    pub async fn execute_icrc1_transfer(&self, tx: &Icrc1Transfer) -> Result<(), CanisterError> {
        let mut args: TransferArg = TransferArg::try_from(tx.clone())
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        // get asset
        let asset = tx
            .asset
            .get_principal()
            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

        let transfer_amount = u128::try_from(args.amount.clone().0);
        match transfer_amount {
            Ok(amount) => {
                let amount_subtract_fee = {
                    let token_fee = self.icrc_service.fee(asset).await?;
                    amount.checked_sub(token_fee as u128)
                };
                match amount_subtract_fee {
                    Some(amount_subtract_fee) => args.amount = Nat::from(amount_subtract_fee),
                    None => {
                        return Err(CanisterError::HandleLogicError(
                            "Failed to calculate fee".to_string(),
                        ));
                    }
                }
            }

            Err(_) => {
                return Err(CanisterError::HandleLogicError(
                    "Failed to convert fee to u128".to_string(),
                ));
            }
        }

        self.icrc_service.transfer(asset, args).await?;

        return Ok(());
    }

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
                        self.execute_icrc2_transfer_from(&tx).await
                    }
                    IcTransaction::Icrc1Transfer(tx) => self.execute_icrc1_transfer(&tx).await,

                    _ => {
                        return Err(CanisterError::HandleLogicError(
                            "Unsupported IcTransaction".to_string(),
                        ));
                    }
                }
            }
            FromCallType::Wallet => {
                return Err(CanisterError::HandleLogicError(
                    "Unsupported from_call_type".to_string(),
                ));
            }
        }
    }

    /// Process transaction execution
    pub async fn execute_tx(&self, tx: &mut Transaction) -> Result<(), CanisterError> {
        self.spawn_tx_timeout_task(tx.id.clone()).map_err(|e| {
            CanisterError::HandleLogicError(format!("Error spawning tx timeout task: {}", e))
        })?;

        self.update_tx_state(tx, &TransactionState::Processing)
            .map_err(|e| {
                CanisterError::HandleLogicError(format!("Error updating tx state: {}", e))
            })?;

        Ok(())
    }

    // Other execution-related methods...
}
