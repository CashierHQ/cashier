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
                return Ok(transaction.state.clone());
            } // _ => return Err("Invalid protocol".to_string()),
        }
    }
}
