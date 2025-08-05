// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::dto::action::TriggerTransactionInput;
use ic_cdk::api::msg_caller;
use ic_cdk::update;
use log::info;

use crate::core::guard::is_not_anonymous;
use crate::services::request_lock::RequestLockService;
use crate::services::transaction_manager::service::TransactionManagerService;
use crate::services::transaction_manager::traits::TransactionExecutor;
use crate::utils::runtime::{IcEnvironment, RealIcEnvironment};
use crate::{
    core::CanisterError,
    services::{self},
};

#[update(guard = "is_not_anonymous")]
pub async fn trigger_transaction(input: TriggerTransactionInput) -> Result<String, CanisterError> {
    let caller = msg_caller();
    let ic_env = RealIcEnvironment::new();

    let validate_service = services::transaction_manager::validate::ValidateService::get_instance();
    let transaction_manager: TransactionManagerService<RealIcEnvironment> =
        TransactionManagerService::get_instance();
    let request_lock_service = RequestLockService::get_instance();

    let is_creator = validate_service
        .is_action_creator(&caller.to_text(), &input.action_id)
        .map_err(|e| CanisterError::ValidationErrors(format!("Failed to validate action: {e}")))?;

    if !is_creator {
        return Err(CanisterError::ValidationErrors(
            "User is not the creator of the action".to_string(),
        ));
    }

    // Create lock for transaction execution
    let request_lock_key = request_lock_service.create_request_lock_for_executing_transaction(
        &caller,
        &input.action_id,
        &input.transaction_id,
        ic_env.time(),
    )?;

    info!(
        "[trigger_transaction] Request lock key: {:?}",
        request_lock_key
    );

    // Execute main logic and capture result
    let result = async {
        transaction_manager
            .execute_tx_by_id(input.transaction_id)
            .await?;

        Ok("Executed success".to_string())
    }
    .await;

    // Drop lock regardless of success or failure
    let _ = request_lock_service.drop(&request_lock_key);

    info!("[trigger_transaction] Request lock dropped");

    result
}
