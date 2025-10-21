// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::CanisterError;
use crate::api::state::get_state;
use crate::services::transaction_manager::traits::TransactionExecutor;
use cashier_backend_types::dto::action::TriggerTransactionInput;
use cashier_common::{
    guard::is_not_anonymous,
    runtime::{IcEnvironment, RealIcEnvironment},
};
use ic_cdk::api::msg_caller;
use ic_cdk::update;
use log::{debug, info};

#[update(guard = "is_not_anonymous")]
pub async fn user_trigger_transaction(input: TriggerTransactionInput) -> Result<String, CanisterError> {
    info!("[user_trigger_transaction]");
    debug!("[user_trigger_transaction] Input: {:?}", input);

    let caller = msg_caller();
    let ic_env = RealIcEnvironment::new();

    let state = get_state();
    let validate_service = state.validate_service;
    let mut transaction_manager = state.transaction_manager_service;
    let mut request_lock_service = state.request_lock_service;

    let is_creator = validate_service
        .is_action_creator(caller, &input.action_id)
        .map_err(|e| CanisterError::ValidationErrors(format!("Failed to validate action: {e}")))?;

    if !is_creator {
        return Err(CanisterError::ValidationErrors(
            "User is not the creator of the action".to_string(),
        ));
    }

    // Create lock for transaction execution
    let request_lock_key = request_lock_service.create_request_lock_for_executing_transaction(
        caller,
        &input.action_id,
        &input.transaction_id,
        ic_env.time(),
    )?;

    info!(
        "[user_trigger_transaction] Request lock key: {:?}",
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

    info!("[user_trigger_transaction] Request lock dropped");

    result
}
