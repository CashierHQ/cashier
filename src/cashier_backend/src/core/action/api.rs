use std::str::FromStr;

use cashier_types::ActionType;
use ic_cdk::update;

use crate::core::guard::is_not_anonymous;
use crate::services::transaction_manager::validate::is_action_creator;
use crate::services::transaction_manager::{TransactionManagerService, UpdateActionArgs};
use crate::utils::runtime::RealIcEnvironment;
use crate::{
    core::{action::types::ActionDto, CanisterError},
    services::{self, link::is_link_creator},
};

use super::types::{CreateActionInput, TriggerTransactionInput, UpdateActionInput};

pub async fn create_action(input: CreateActionInput) -> Result<ActionDto, CanisterError> {
    let caller = ic_cdk::api::caller();

    let action_type = ActionType::from_str(&input.action_type)
        .map_err(|_| CanisterError::ValidationErrors(format!("Invalid intent type ")))?;

    match action_type {
        ActionType::CreateLink => {
            if !is_link_creator(caller.to_text(), &input.link_id) {
                return Err(CanisterError::ValidationErrors(
                    "User is not the creator of the link".to_string(),
                ));
            }
        }

        _ => {
            return Err(CanisterError::ValidationErrors(
                "Invalid intent type".to_string(),
            ));
        }
    }

    services::transaction_manager::create::create_link_action(input).await
}

#[update(guard = "is_not_anonymous")]
pub async fn update_action(input: UpdateActionInput) -> Result<ActionDto, CanisterError> {
    let transaction_manager: TransactionManagerService<RealIcEnvironment> =
        TransactionManagerService::get_instance();

    let caller = ic_cdk::api::caller();

    let is_creator = is_action_creator(caller.to_text(), input.action_id.clone()).map_err(|e| {
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
        external: true,
    };

    transaction_manager
        .update_action(args)
        .await
        .map_err(|e| CanisterError::HandleLogicError(format!("Failed to update action: {}", e)))
}

#[update(guard = "is_not_anonymous")]
pub async fn trigger_transaction(input: TriggerTransactionInput) -> Result<(), CanisterError> {
    let caller = ic_cdk::api::caller();

    let is_creator = is_action_creator(caller.to_text(), input.action_id).map_err(|e| {
        CanisterError::ValidationErrors(format!("Failed to validate action: {}", e))
    })?;

    if !is_creator {
        return Err(CanisterError::ValidationErrors(
            "User is not the creator of the action".to_string(),
        ));
    }

    let transaction_manager: TransactionManagerService<RealIcEnvironment> =
        TransactionManagerService::get_instance();

    transaction_manager
        .execute_tx_by_id(input.transaction_id)
        .await
}
