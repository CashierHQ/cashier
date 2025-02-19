use cashier_types::{Transaction, TransactionState};

use crate::{
    repositories::{self},
    services::transaction_manager::{self},
};

pub fn update_tx_state(tx: &mut Transaction, state: TransactionState) -> Result<(), String> {
    if tx.state == state {
        return Ok(());
    }

    tx.state = state;

    let tx_repository = repositories::transaction::TransactionRepository {};

    tx_repository.update(tx.clone());

    let service = transaction_manager::action::ActionService::new();

    service
        .roll_up_state(tx.id.clone())
        .map_err(|e| format!("roll_up_state failed: {}", e))?;

    Ok(())
}
