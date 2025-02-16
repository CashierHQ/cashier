use cashier_types::{FromCallType, IcTransaction, Protocol, Transaction, TransactionState};

use crate::constant::TX_TIMEOUT;

mod validate_allowance;
mod validate_balance_transfer;

pub async fn manual_check_status(transaction: &Transaction) -> Result<TransactionState, String> {
    let ts = ic_cdk::api::time();

    // If the transaction is created, it means it never ran, so no need to check status
    if transaction.state != TransactionState::Processing {
        return Ok(transaction.state.clone());
    }

    // Check if the transaction has timed out
    if let Some(start_ts) = transaction.start_ts {
        // if timout is less than or equal to the current time, the transaction has timed out
        let tx_timeout = TX_TIMEOUT.parse::<u64>().unwrap();
        if start_ts - ts >= tx_timeout {
            return Ok(TransactionState::Fail);
        }

        if transaction.from_call_type == FromCallType::Wallet {
            return Ok(transaction.state.clone());
        }
    }

    match &transaction.protocol {
        // Check balance for Icrc1Transfer
        Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer_info)) => {
            let is_valid =
                validate_balance_transfer::validate_balance_transfer(&icrc1_transfer_info).await?;

            if is_valid {
                return Ok(TransactionState::Success);
            } else {
                return Ok(TransactionState::Fail);
            }
        }
        // Check allowance for Icrc2Approve
        Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve_info)) => {
            let is_valid = validate_allowance::validate_allowance(&icrc2_approve_info).await?;

            if is_valid {
                return Ok(TransactionState::Success);
            } else {
                return Ok(TransactionState::Fail);
            }
        }
        // Canister call, so no need to check
        Protocol::IC(IcTransaction::Icrc2TransferFrom(_)) => {
            return Ok(transaction.state.clone());
        } // _ => return Err("Invalid protocol".to_string()),
    }
}
