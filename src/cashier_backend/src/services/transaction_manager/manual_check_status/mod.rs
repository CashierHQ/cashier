use cashier_types::{IcTransaction, Protocol, TransactionState};

use crate::repositories;

mod validate_allowance;
mod validate_balance_transfer;

pub async fn manual_check_status(tx_id: String) -> Result<TransactionState, String> {
    let transaction = repositories::transaction::get(&tx_id)
        .ok_or_else(|| "Transaction not found".to_string())?;

    match transaction.protocol {
        Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer_info)) => {
            let is_valid =
                validate_balance_transfer::validate_balance_transfer(&icrc1_transfer_info).await?;

            if is_valid {
                return Ok(TransactionState::Success);
            } else {
                return Ok(TransactionState::Fail);
            }
        }
        Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from_info)) => {
            let is_valid =
                validate_allowance::validate_allowance(&icrc2_transfer_from_info).await?;

            if is_valid {
                return Ok(TransactionState::Success);
            } else {
                return Ok(TransactionState::Fail);
            }
        }
        _ => {
            return Err(
                "Manual check status is not implemented for this transaction protocol".to_string(),
            )
        }
    }
}
