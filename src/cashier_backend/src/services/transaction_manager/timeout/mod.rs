use cashier_types::Transaction;

use crate::{
    constant::TX_TIMEOUT,
    services::transaction_manager::{manual_check_status, transaction::update_tx_state},
    utils::{
        icrc::IcrcService,
        runtime::{IcEnvironment, RealIcEnvironment},
    },
};

pub async fn tx_timeout_task(tx: &mut Transaction) -> Result<(), String> {
    println!("Transaction timeout task: {:?}", tx);

    if tx.start_ts.is_none() {
        return Err("Transaction start_ts is None".to_string());
    }

    let current_ts = ic_cdk::api::time();

    let tx_timeout: u64 = TX_TIMEOUT.parse().unwrap();

    if tx.start_ts.unwrap() + tx_timeout < current_ts {
        let icrc_service = IcrcService::new();

        let ic_env = RealIcEnvironment::new();

        let manual_check_status_service =
            manual_check_status::ManualCheckStatusService::new(icrc_service, ic_env);

        let state = manual_check_status_service
            .execute(&tx)
            .await
            .map_err(|e| format!("Error in manual check status: {:?}", e))?;
        update_tx_state::update_tx_state(tx, state)
    } else {
        return Err("Transaction is not timeout".to_string());
    }
}
