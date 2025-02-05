use std::str::FromStr;

use cashier_types::ActionType;
use ic_cdk::update;

use crate::{
    core::{action::types::ActionDto, guard::is_not_anonymous, CanisterError, ProcessActionInput},
    services::{self, link::is_link_creator},
};

use super::types::CreateActionInput;

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
pub async fn process_action(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
    let caller: candid::Principal = ic_cdk::api::caller();

    if input.action_id.is_empty() {
        return create_action(CreateActionInput {
            action_type: input.action_type.clone(),
            link_id: input.link_id.clone(),
            params: input.params.clone(),
        })
        .await;
    } else {
        // TODO: Call the process_action of the transaction_manager
        return Err(CanisterError::ValidationErrors(
            "not implemented".to_string(),
        ));
    }
}

// pub async fn update_action(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
//     services::transaction_manager::update::update_action(input).await
// }
