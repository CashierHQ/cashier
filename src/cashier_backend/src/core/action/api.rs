use std::str::FromStr;

use cashier_types::ActionType;
use ic_cdk::update;

use crate::core::guard::is_not_anonymous;
use crate::{
    core::{action::types::ActionDto, CanisterError},
    services::{self, link::is_link_creator},
};

use super::types::{CreateActionInput, UpdateActionInput};

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
    services::transaction_manager::update_action::update_action(
        input.action_id,
        input.link_id,
        input.external,
    )
    .await
    .map_err(|e| CanisterError::HandleLogicError(format!("Failed to update action: {}", e)))
}

// pub async fn update_action(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
//     services::transaction_manager::update::update_action(input).await
// }
