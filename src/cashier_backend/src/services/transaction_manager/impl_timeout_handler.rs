// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    constant::{get_tx_timeout_nano_seconds, get_tx_timeout_seconds},
    services::transaction_manager::{service::TransactionManagerService, traits::TimeoutHandler},
};
use crate::{
    repositories::Repositories, services::transaction_manager::traits::TransactionValidator,
};
use cashier_backend_types::{error::CanisterError, repository::transaction::v2::TransactionState};
use cashier_common::runtime::{IcEnvironment, RealIcEnvironment};
use log::{error, info};
use std::time::Duration;

impl<E: 'static + IcEnvironment + Clone, R: 'static + Repositories> TimeoutHandler<E>
    for TransactionManagerService<E, R>
{
    fn spawn_tx_timeout_task(&self, tx_id: String) -> Result<(), String> {
        let timeout = get_tx_timeout_seconds();

        let mut service = self.clone();
        // TODO: canister upgrade will remove the time_id, this should store in stable memory and re_triggered when the canister is upgraded
        let _time_id = self
            .ic_env
            .set_timer(Duration::from_secs(timeout), move || {
                let ic_env_in_future = RealIcEnvironment::new();

                ic_env_in_future.spawn(async move {
                    // Now use the new service instance
                    let res = service.tx_timeout_task(tx_id).await;
                    match res {
                        Ok(_) => {}
                        Err(e) => {
                            error!("Transaction timeout task executed with error: {:?}", e);
                        }
                    }
                });
            });
        Ok(())
    }

    async fn tx_timeout_task(&mut self, tx_id: String) -> Result<(), CanisterError> {
        let mut tx = self.transaction_service.get_tx_by_id(&tx_id)?;

        if tx.state == TransactionState::Success || tx.state == TransactionState::Fail {
            self.remove_record_in_processing_transaction(&tx_id);
            return Ok(());
        }
        let start_ts = tx.start_ts.ok_or_else(|| {
            CanisterError::HandleLogicError("Transaction start_ts is None".to_string())
        })?;

        let current_ts = ic_cdk::api::time();
        let tx_timeout = get_tx_timeout_nano_seconds();

        if current_ts - start_ts >= tx_timeout {
            let state = self.manual_check_status(&tx, vec![]).await;

            let _ = self.transaction_service.update_tx_state(&mut tx, &state);

            let result = self.action_service.roll_up_state(&tx.id).map_err(|e| {
                CanisterError::HandleLogicError(format!("Failed to roll up state for action: {e}"))
            });

            self.remove_record_in_processing_transaction(&tx_id);

            match result {
                Ok(_) => Ok(()),
                Err(e) => {
                    error!("Failed to roll up state for action: {:?}", e);
                    // Respawn timeout task for retry in case of error
                    let retry_tx_id = tx_id.clone();
                    let _ = self
                        .spawn_tx_timeout_task(retry_tx_id)
                        .map_err(|spawn_err| {
                            error!(
                                "Failed to respawn timeout task for transaction {}: {}",
                                tx_id, spawn_err
                            );
                        });
                    Err(e)
                }
            }
        } else {
            // Transaction hasn't timed out yet, reschedule the timeout task
            let remaining_time_ns = tx_timeout - (current_ts - start_ts);
            let retry_duration = Duration::from_nanos(remaining_time_ns) + Duration::from_secs(2); // Add buffer

            info!(
                "Transaction {} has not timed out yet. Rescheduling timeout task in {} nanoseconds",
                tx_id, remaining_time_ns
            );

            let retry_tx_id = tx_id.clone();
            let mut service = self.clone();
            let _time_id = self.ic_env.set_timer(retry_duration, move || {
                let ic_env_in_future = RealIcEnvironment::new();

                ic_env_in_future.spawn(async move {
                    let res = service.tx_timeout_task(retry_tx_id).await;
                    match res {
                        Ok(_) => {}
                        Err(e) => {
                            error!(
                                "Rescheduled transaction timeout task executed with error: {:?}",
                                e
                            );
                        }
                    }
                });
            });

            Ok(()) // Return Ok since we've successfully rescheduled the task
        }
    }

    fn restart_processing_transactions(&self) {
        let processing_transactions = self.processing_transaction_repository.get_all();
        info!(
            "Restarting processing transactions: {}",
            processing_transactions.len()
        );
        let current_time = ic_cdk::api::time();

        info!(
            "Restarting processing transactions: {}",
            processing_transactions.len()
        );

        for processing_tx in processing_transactions {
            // Calculate remaining duration until timeout
            let remaining_duration_ns = processing_tx.timeout_at.saturating_sub(current_time);
            info!(
                "Scheduling timeout task for transaction {} in {} nanoseconds",
                processing_tx.transaction_id, remaining_duration_ns
            );

            // add bufffer time for avoiding calling anither canister in tx_timeout_task
            // doc: https://internetcomputer.org/docs/references/execution-errors#calling-a-system-api-from-the-wrong-mode
            let duration = Duration::from_nanos(remaining_duration_ns) + Duration::from_secs(2);

            // Spawn timeout task with calculated duration
            let tx_id = processing_tx.transaction_id.clone();
            let mut service = self.clone();
            let _time_id = self.ic_env.set_timer(duration, move || {
                let ic_env_in_future = RealIcEnvironment::new();

                ic_env_in_future.spawn(async move {
                    // Now use the new service instance
                    let res = service.tx_timeout_task(tx_id).await;
                    match res {
                        Ok(_) => {}
                        Err(e) => {
                            error!("Transaction timeout task executed with error: {:?}", e);
                        }
                    }
                });
            });
        }
    }
}

impl<E: IcEnvironment + Clone, R: Repositories> TransactionManagerService<E, R> {
    fn remove_record_in_processing_transaction(&mut self, tx_id: &str) {
        if self.processing_transaction_repository.exists(tx_id) {
            self.processing_transaction_repository.delete(tx_id);
        }
    }
}
