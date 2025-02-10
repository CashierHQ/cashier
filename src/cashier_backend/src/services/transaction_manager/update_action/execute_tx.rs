use cashier_types::{Transaction, TransactionState};

use crate::services::transaction_manager::transaction::update_tx_state::update_tx_state;

pub fn execute_tx(tx: &mut Transaction) -> Result<(), String> {
    //TODO: Spawn task
    update_tx_state(tx, TransactionState::Processing)?;
    Ok(())
}
