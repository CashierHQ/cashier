use std::collections::HashMap;

use cashier_types::{Transaction, TransactionState};

pub fn has_dependency(tx: &Transaction, tx_map: &HashMap<String, Transaction>) -> bool {
    if tx.dependency.is_none() {
        return false;
    }

    let dependency_ids = tx.dependency.as_ref().unwrap();
    let is_all_finished = dependency_ids
        .iter()
        .filter_map(|id| tx_map.get(id))
        .all(|tx| tx.state == TransactionState::Success);

    return is_all_finished;
}
