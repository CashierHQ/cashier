use cashier_types::TransactionState;

use crate::repositories::{self};

use super::action::{get_action_by_tx_id::get_action_by_tx_id, roll_up_state};

pub fn update_tx_state(tx_id: String, state: TransactionState) -> Result<(), String> {
    let mut tx = repositories::transaction::get(&tx_id).ok_or_else(|| "transaction not found")?;

    let action_resp = get_action_by_tx_id(tx_id.clone())
        .map_err(|e| format!("get_action_by_tx_id failed: {}", e))?;

    tx.state = state;
    repositories::transaction::update(tx);
    roll_up_state::roll_up_state(
        action_resp.action,
        action_resp.intents,
        action_resp.intent_txs,
    )
    .map_err(|e| format!("roll_up_state failed: {}", e))?;

    Ok(())
}
