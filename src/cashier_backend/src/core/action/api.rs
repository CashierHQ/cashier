// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_cdk::update;

use crate::core::guard::is_not_anonymous;
use crate::services::transaction_manager::service::TransactionManagerService;
use crate::utils::runtime::RealIcEnvironment;
use crate::{
    core::CanisterError,
    services::{self},
};

use super::types::TriggerTransactionInput;

#[update(guard = "is_not_anonymous")]
pub async fn trigger_transaction(input: TriggerTransactionInput) -> Result<String, CanisterError> {
    let caller = ic_cdk::api::caller();

    let validate_service = services::transaction_manager::validate::ValidateService::get_instance();
    let transaction_manager: TransactionManagerService<RealIcEnvironment> =
        TransactionManagerService::get_instance();

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

    transaction_manager
        .execute_tx_by_id(input.transaction_id)
        .await?;

    return Ok("Executed success".to_string());
}
