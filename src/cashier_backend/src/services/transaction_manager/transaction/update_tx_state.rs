use cashier_types::{Transaction, TransactionState};

use crate::{
    repositories::{self},
    services::transaction_manager::action::roll_up_state,
};

pub fn update_tx_state(tx: &mut Transaction, state: TransactionState) -> Result<(), String> {
    if tx.state == state {
        return Ok(());
    }

    tx.state = state;
    repositories::transaction::update(tx.clone());

    roll_up_state::roll_up_state(tx.id.clone())
        .map_err(|e| format!("roll_up_state failed: {}", e))?;

    Ok(())
}
