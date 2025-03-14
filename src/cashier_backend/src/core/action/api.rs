use ic_cdk::update;

use crate::core::guard::is_not_anonymous;
use crate::services::transaction_manager::{TransactionManagerService, UpdateActionArgs};
use crate::utils::runtime::RealIcEnvironment;
use crate::{
    core::{action::types::ActionDto, CanisterError},
    services::{self},
};

use super::types::{TriggerTransactionInput, UpdateActionInput};

#[update(guard = "is_not_anonymous")]
pub async fn update_action(input: UpdateActionInput) -> Result<ActionDto, CanisterError> {
    let transaction_manager: TransactionManagerService<RealIcEnvironment> =
        TransactionManagerService::get_instance();

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

    let args = UpdateActionArgs {
        action_id: input.action_id.clone(),
        link_id: input.link_id.clone(),
        execute_wallet_tx: true,
    };

    transaction_manager
        .update_action(args)
        .await
        .map_err(|e| CanisterError::HandleLogicError(format!("Failed to update action: {}", e)))
}

#[update(guard = "is_not_anonymous")]
pub async fn trigger_transaction(input: TriggerTransactionInput) -> Result<String, CanisterError> {
    let caller = ic_cdk::api::caller();
    let validate_service = services::transaction_manager::validate::ValidateService::get_instance();

    let is_creator = validate_service
        .is_action_creator(caller.to_text(), input.action_id)
        .map_err(|e| {
            CanisterError::ValidationErrors(format!("Failed to validate action: {}", e))
        })?;

    if !is_creator {
        return Err(CanisterError::ValidationErrors(
            "User is not the creator of the action".to_string(),
        ));
    }

    // TODO: remove this after testing
    let link = services::link::get_link_by_id(input.link_id.clone())
        .map_err(|e| CanisterError::HandleLogicError(format!("Failed to get link: {}", e)))?;

    if let Some(title) = &link.title {
        if title.contains("7.4") {
            let transaction_manager: TransactionManagerService<RealIcEnvironment> =
                TransactionManagerService::get_instance();

            transaction_manager
                .execute_test_fail(input.transaction_id)
                .await?;

            return Ok("Executed success".to_string());
        } else {
            let transaction_manager: TransactionManagerService<RealIcEnvironment> =
                TransactionManagerService::get_instance();

            transaction_manager
                .execute_tx_by_id(input.transaction_id)
                .await?;

            return Ok("Executed success".to_string());
        }
    }

    Ok("Executed success".to_string())
}
