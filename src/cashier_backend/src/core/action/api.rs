use ic_cdk::update;

use crate::core::guard::is_not_anonymous;
use crate::info;
use crate::services::transaction_manager::TransactionManagerService;
use crate::utils::runtime::RealIcEnvironment;
use crate::{
    core::CanisterError,
    services::{self},
};

use super::types::TriggerTransactionInput;

#[update(guard = "is_not_anonymous")]
pub async fn trigger_transaction(input: TriggerTransactionInput) -> Result<String, CanisterError> {
    let start_time = ic_cdk::api::time();
    let caller = ic_cdk::api::caller();
    let validate_service = services::transaction_manager::validate::ValidateService::get_instance();

    let is_creator = validate_service
        .is_action_creator(caller.to_text(), input.action_id.clone())
        .map_err(|e| {
            CanisterError::ValidationErrors(format!("Failed to validate action: {}", e))
        })?;

    if !is_creator {
        return Err(CanisterError::ValidationErrors(
            "User is not the creator of the action".to_string(),
        ));
    }

    info!("Triggering transaction for action: {}", input.action_id);

    let transaction_manager: TransactionManagerService<RealIcEnvironment> =
        TransactionManagerService::get_instance();

    transaction_manager
        .execute_tx_by_id(input.transaction_id)
        .await?;

    let end_time = ic_cdk::api::time();
    let elapsed_time = end_time - start_time;
    let elapsed_seconds = (elapsed_time as f64) / 1_000_000_000.0;
    info!("[trigger_transaction] in {} seconds", elapsed_seconds);

    return Ok("Executed success".to_string());
}
