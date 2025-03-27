use cashier_types::TransactionState;

use crate::{
    constant::get_tx_timeout_nano_seconds,
    services::transaction_manager::manual_check_status::ManualCheckStatusService,
    types::error::CanisterError,
    utils::{
        icrc::IcrcService,
        runtime::{IcEnvironment, RealIcEnvironment},
    },
};

use super::{action::ActionService, transaction::TransactionService};

pub async fn tx_timeout_task(tx_id: String) -> Result<(), CanisterError> {
    let transaction_service: TransactionService<RealIcEnvironment> =
        TransactionService::get_instance();

    let action_service: ActionService<RealIcEnvironment> = ActionService::get_instance();

    let mut tx = transaction_service.get_tx_by_id(&tx_id)?;

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
        let icrc_service = IcrcService::new();

        let ic_env = RealIcEnvironment::new();

        let manual_check_status_service = ManualCheckStatusService::new(icrc_service, ic_env);

        let state = manual_check_status_service.execute(&tx, vec![]).await?;

        let _ = transaction_service.update_tx_state(&mut tx, &state.clone());

        action_service.roll_up_state(tx.id.clone()).map_err(|e| {
            CanisterError::HandleLogicError(format!("Failed to roll up state for action: {}", e))
        })?;

        Ok(())
    } else {
        return Err(CanisterError::ValidationErrors(
            "Transaction is not timeout".to_string(),
        ));
    }
}
