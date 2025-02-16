use cashier_types::Transaction;

use crate::{
    constant::TX_TIMEOUT,
    services::transaction_manager::{manual_check_status, transaction::update_tx_state},
};

pub async fn tx_timeout_task(tx: &mut Transaction) -> Result<(), String> {
    println!("Transaction timeout task: {:?}", tx);

    if tx.start_ts.is_none() {
        return Err("Transaction start_ts is None".to_string());
    }

    let current_ts = ic_cdk::api::time();

    let tx_timeout: u64 = TX_TIMEOUT.parse().unwrap();

    if tx.start_ts.unwrap() + tx_timeout < current_ts {
        let state = manual_check_status::manual_check_status(&tx).await?;
        update_tx_state::update_tx_state(tx, state)
    } else {
        return Err("Transaction is not timeout".to_string());
    }
}
