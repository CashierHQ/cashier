use std::time::Duration;

use cashier_types::TransactionState;

use crate::{
    constant::get_tx_timeout_nano_seconds,
    info,
    services::transaction_manager::TransactionManagerService,
    types::error::CanisterError,
    utils::runtime::{IcEnvironment, RealIcEnvironment},
};

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn spawn_tx_timeout_task(&self, tx_id: String) -> Result<(), String> {
        let tx_id = tx_id.clone();

        let _time_id = self.ic_env.set_timer(Duration::from_secs(300), move || {
            let ic_env_in_future = RealIcEnvironment::new();

            ic_env_in_future.spawn(async move {
                // Create a new instance of your service with the cloned dependencies
                let service: TransactionManagerService<RealIcEnvironment> =
                    TransactionManagerService::get_instance();

                // Now use the new service instance
                let res = service.tx_timeout_task(tx_id).await;
                match res {
                    Ok(_) => {}
                    Err(e) => {
                        info!("Transaction timeout task executed with error: {}", e);
                    }
                }
            });
        });
        Ok(())
    }

    pub async fn tx_timeout_task(&self, tx_id: String) -> Result<(), CanisterError> {
        let mut tx = self.transaction_service.get_tx_by_id(&tx_id)?;

        if tx.state == TransactionState::Success || tx.state == TransactionState::Fail {
            return Ok(());
        }

        if tx.start_ts.is_none() {
            return Err(CanisterError::HandleLogicError(
                "Transaction start_ts is None".to_string(),
            ));
        }

        let current_ts = ic_cdk::api::time();

        let tx_timeout: u64 = get_tx_timeout_nano_seconds();

        if current_ts - tx.start_ts.unwrap() >= tx_timeout {
            let state = self
                .manual_check_status_service
                .execute(&tx, vec![])
                .await?;

            let _ = self
                .transaction_service
                .update_tx_state(&mut tx, &state.clone());

            self.action_service
                .roll_up_state(tx.id.clone())
                .map_err(|e| {
                    CanisterError::HandleLogicError(format!(
                        "Failed to roll up state for action: {}",
                        e
                    ))
                })?;

            Ok(())
        } else {
            return Err(CanisterError::ValidationErrors(
                "Transaction is not timeout".to_string(),
            ));
        }
    }
}
