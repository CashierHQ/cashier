use cashier_types::{IcTransaction, Protocol, Transaction, TransactionState};

use crate::{
    types::error::CanisterError,
    utils::{icrc::IcrcService, runtime::IcEnvironment},
};

mod validate_allowance;
mod validate_balance_transfer;

#[cfg_attr(test, faux::create)]
pub struct ManualCheckStatusService<E: IcEnvironment> {
    icrc_service: IcrcService,
    ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment> ManualCheckStatusService<E> {
    pub fn new(icrc_service: IcrcService, ic_env: E) -> Self {
        Self {
            icrc_service,
            ic_env: ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(IcrcService::new(), IcEnvironment::new())
    }

    pub async fn execute(
        &self,
        transaction: &Transaction,
        // This is temporary, will be removed when the fee change to icrc1
        txs: Vec<Transaction>,
    ) -> Result<TransactionState, CanisterError> {
        // If the transaction is created, it means it never ran, so no need to check status
        if transaction.state != TransactionState::Processing {
            return Ok(transaction.state.clone());
        }

        // if timeout check the condition
        match &transaction.protocol {
            // Check balance for Icrc1Transfer
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer_info)) => {
                let is_valid = validate_balance_transfer::validate_balance_transfer(
                    &self.icrc_service,
                    &icrc1_transfer_info,
                )
                .await;

                match is_valid {
                    Ok(valid) => {
                        if valid {
                            Ok(TransactionState::Success)
                        } else {
                            Ok(TransactionState::Fail)
                        }
                    }
                    Err(_) => Ok(TransactionState::Fail),
                }
            }
            // Check allowance for Icrc2Approve
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve_info)) => {
                // THIS IS A HACK to check if the transfer from is success
                // if the transfer from is success then the approve is success
                // TODO: delete this when the fee change to icrc1
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

                // if the transfer from is success then return success
                if txs_depended.len() > 0 {
                    let is_all_success = txs_depended
                        .iter()
                        .all(|tx| tx.state == TransactionState::Success);
                    if is_all_success {
                        return Ok(TransactionState::Success);
                    }
                }

                let is_valid =
                    validate_allowance::validate_allowance(&self.icrc_service, &icrc2_approve_info)
                        .await;

                match is_valid {
                    Ok(valid) => {
                        if valid {
                            Ok(TransactionState::Success)
                        } else {
                            Ok(TransactionState::Fail)
                        }
                    }
                    Err(_) => Ok(TransactionState::Fail),
                }
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(_)) => {
                // if this being called it mean the tx is timeout -> fail
                return Ok(TransactionState::Fail);
            } // _ => return Err("Invalid protocol".to_string()),
        }
    }
}
