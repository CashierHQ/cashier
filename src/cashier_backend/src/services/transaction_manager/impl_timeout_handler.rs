// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::transaction_manager::traits::TransactionValidator;
use async_trait::async_trait;
use cashier_types::transaction::v2::TransactionState;
use std::time::Duration;

use crate::{
    constant::{get_tx_timeout_nano_seconds, get_tx_timeout_seconds},
    error,
    services::transaction_manager::{service::TransactionManagerService, traits::TimeoutHandler},
    types::error::CanisterError,
    utils::runtime::{IcEnvironment, RealIcEnvironment},
};

#[async_trait(?Send)]
impl<E: IcEnvironment + Clone> TimeoutHandler<E> for TransactionManagerService<E> {
    fn spawn_tx_timeout_task(&self, tx_id: String) -> Result<(), String> {
        let timeout = get_tx_timeout_seconds();

        // TODO: canister upgrade will remove the time_id, this should store in stable memory and re_triggered when the canister is upgraded
        let _time_id = self
            .ic_env
            .set_timer(Duration::from_secs(timeout), move || {
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
                            error!("Transaction timeout task executed with error: {}", e);
                        }
                    }
                });
            });
        Ok(())
    }

    async fn tx_timeout_task(&self, tx_id: String) -> Result<(), CanisterError> {
        let mut tx = self.transaction_service.get_tx_by_id(&tx_id)?;

        if tx.state == TransactionState::Success || tx.state == TransactionState::Fail {
            return Ok(());
        }
        let start_ts = tx.start_ts.ok_or_else(|| {
            CanisterError::HandleLogicError("Transaction start_ts is None".to_string())
        })?;

        let current_ts = ic_cdk::api::time();
        let tx_timeout = get_tx_timeout_nano_seconds();

        if current_ts - start_ts >= tx_timeout {
            let state = self.manual_check_status(&tx, vec![]).await?;

            let _ = self.transaction_service.update_tx_state(&mut tx, &state);

            self.action_service.roll_up_state(&tx.id).map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Failed to roll up state for action: {}",
                    e
                ))
            })?;

            Ok(())
        } else {
            Err(CanisterError::ValidationErrors(
                "Transaction is not timeout".to_string(),
            ))
        }
    }
}
