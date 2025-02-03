use std::str::FromStr;

use cashier_types::ActionType;
use ic_cdk::update;

use crate::{
    core::{
        action::types::ActionDto, guard::is_not_anonymous, CanisterError, ConfirmActionInput,
        UpdateActionInput,
    },
    services::{self, link::is_link_creator},
};

use super::types::CreateActionInput;

#[update(guard = "is_not_anonymous")]
pub async fn create_action(input: CreateActionInput) -> Result<ActionDto, CanisterError> {
    let caller = ic_cdk::api::caller();

    let intent_type = ActionType::from_str(&input.action_type)
        .map_err(|_| CanisterError::ValidationErrors(format!("Invalid intent type ")))?;

    match intent_type {
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
pub async fn confirm_action(input: ConfirmActionInput) -> Result<ActionDto, String> {
    Ok(ActionDto {
        id: "id".to_string(),
        r#type: ActionType::CreateLink.to_string(),
        state: "state".to_string(),
        creator: "creator".to_string(),
        intents: vec![],
    })
}

#[update(guard = "is_not_anonymous")]
pub async fn update_action(input: UpdateActionInput) -> Result<ActionDto, String> {
    // let caller = ic_cdk::api::caller();

    // let is_creator = services::transaction_manager::validate::is_action_creator(
    //     caller.to_text(),
    //     input.intent_id,
    // )?;

    // if !is_creator {
    //     return Err("Caller is not the creator of the action".to_string());
    // }

    Ok(ActionDto {
        id: "id".to_string(),
        r#type: ActionType::CreateLink.to_string(),
        state: "state".to_string(),
        creator: "creator".to_string(),
        intents: vec![],
    })

    // services::transaction_manager::update::update_transaction_and_roll_up(input).await
}
