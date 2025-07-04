use crate::{
    core::{
        action::types::ActionDto,
        link::types::{
            LinkGetUserStateInput, LinkGetUserStateOutput, LinkUpdateUserStateInput,
            UserStateMachineGoto,
        },
    },
    services::link::{service::LinkService, traits::LinkUserStateMachine},
    types::error::CanisterError,
    utils::runtime::IcEnvironment,
};
use std::str::FromStr;

use candid::Principal;
use cashier_types::{
    action::v1::{ActionState, ActionType},
    link_action::v1::{LinkAction, LinkUserState},
};

impl<E: IcEnvironment + Clone> LinkUserStateMachine for LinkService<E> {
    fn handle_user_link_state_machine(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
        goto: &UserStateMachineGoto,
    ) -> Result<LinkAction, CanisterError> {
        // check inputs that can be changed this state
        let action_list = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);

        if action_list.is_empty() {
            return Err(CanisterError::NotFound("Link action not found".to_string()));
        }

        let mut link_action = action_list[0].clone();

        // Validate current state
        let current_user_state = link_action
            .link_user_state
            .clone()
            .ok_or_else(|| CanisterError::HandleLogicError("unknown state".to_string()))?;

        // Flattened state transitions using if/else
        let new_state;

        // Check if we're in final state (CompletedLink)
        if current_user_state == LinkUserState::CompletedLink {
            return Err(CanisterError::HandleLogicError(
                "current state is final state".to_string(),
            ));
        }
        //
        // !Start of user state machine
        //
        // Check for valid transition: ChooseWallet -> CompletedLink
        else if current_user_state == LinkUserState::ChooseWallet
            && *goto == UserStateMachineGoto::Continue
        {
            // Validate the action exists and is successful
            let action = self
                .get_action_of_link(link_id, action_type, user_id)
                .ok_or_else(|| CanisterError::NotFound("Action not found".to_string()))?;

            if action.state != ActionState::Success {
                return Err(CanisterError::HandleLogicError(
                    "Action is not success".to_string(),
                ));
            }

            // Set the new state
            new_state = LinkUserState::CompletedLink;
        }
        // !End of state machine logic

        // Any other transition is invalid
        else {
            return Err(CanisterError::HandleLogicError(format!(
                "current state {:#?} is not allowed to transition: {:#?}",
                current_user_state, goto
            )));
        }

        // Only update the state field
        link_action.link_user_state = Some(new_state);

        // Update in repository
        self.link_action_repository.update(link_action.clone());

        // Return the updated link_action
        Ok(link_action)
    }

    fn link_get_user_state(
        &self,
        caller: &Principal,
        input: &LinkGetUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
        // only support claim action type
        match ActionType::from_str(&input.action_type) {
            Ok(action_type) => {
                if action_type != ActionType::Use {
                    return Err(CanisterError::ValidationErrors(
                        "
                                Invalid action type, only Claim or Use action type is allowed
                                "
                        .to_string(),
                    ));
                }
            }
            Err(_) => {
                return Err(CanisterError::ValidationErrors(
                    "
                            Invalid action type
                            "
                    .to_string(),
                ));
            }
        }

        let temp_user_id = if *caller != Principal::anonymous() {
            self.user_service.get_user_id_by_wallet(&caller)
        } else {
            input
                .anonymous_wallet_address
                .as_ref()
                .map(|addr| format!("ANON#{}", addr))
        };
        // Check if temp_user_id is None and return error
        let temp_user_id = temp_user_id
            .ok_or_else(|| CanisterError::ValidationErrors("User ID is required".to_string()))?;

        // Check "LinkAction" table to check records with
        // link_action link_id = input link_id
        // link_action type = input action type
        // link_action user_id = search_user_id
        let link_action =
            self.get_link_action_user(&input.link_id, &input.action_type, &temp_user_id)?;

        if link_action.is_none() {
            return Ok(None);
        }

        let link_action = link_action
            .ok_or_else(|| CanisterError::HandleLogicError("Link action not found".to_string()))?;

        // If found "LinkAction" values
        // return action = get action from (action _id)
        // return state = record user_state
        let action_id = link_action.action_id.clone();
        let link_user_state =
            link_action
                .link_user_state
                .ok_or(CanisterError::HandleLogicError(
                    "Link user state is not found".to_string(),
                ))?;

        let action = self
            .action_service
            .get_action_data(&action_id)
            .map_err(|e| CanisterError::HandleLogicError(format!("Failed to get action: {}", e)))?;

        Ok(Some(LinkGetUserStateOutput {
            action: ActionDto::from_with_tx(action.action, action.intents, &action.intent_txs),
            link_user_state: link_user_state.to_string(),
        }))
    }

    fn link_update_user_state(
        &self,
        caller: &Principal,
        input: &LinkUpdateUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
        // validate action type
        match ActionType::from_str(&input.action_type) {
            Ok(action_type) => {
                if action_type != ActionType::Use {
                    return Err(CanisterError::ValidationErrors(
                        "
                        Invalid action type, only Claim or Use  action type is allowed
                        "
                        .to_string(),
                    ));
                }
            }
            Err(_) => {
                return Err(CanisterError::ValidationErrors(
                    "
                    Invalid action type
                    "
                    .to_string(),
                ));
            }
        }

        let temp_user_id = if *caller != Principal::anonymous() {
            self.user_service.get_user_id_by_wallet(caller)
        } else {
            input
                .anonymous_wallet_address
                .as_ref()
                .map(|addr| format!("ANON#{}", addr))
        };
        // Check if temp_user_id is None and return error
        let temp_user_id = temp_user_id
            .ok_or_else(|| CanisterError::ValidationErrors("User ID is required".to_string()))?;

        let goto = UserStateMachineGoto::from_str(&input.goto)
            .map_err(|e| CanisterError::ValidationErrors(format!("Invalid goto: {}", e)))?;

        let link_action = self.handle_user_link_state_machine(
            &input.link_id,
            &input.action_type,
            &temp_user_id,
            &goto,
        )?;

        // If not found
        // return action = null
        // return link_user_state = null
        // If found "LinkAction" values
        // return action = get action from (action _id)
        // return state = record user_state
        let link_user_state =
            link_action
                .link_user_state
                .clone()
                .ok_or(CanisterError::HandleLogicError(
                    "Link user state is not found".to_string(),
                ))?;

        let action = self
            .action_service
            .get_action_data(&link_action.action_id)
            .map_err(|e| CanisterError::HandleLogicError(format!("Failed to get action: {}", e)))?;

        Ok(Some(LinkGetUserStateOutput {
            action: ActionDto::from_with_tx(action.action, action.intents, &action.intent_txs),
            link_user_state: link_user_state.to_string(),
        }))
    }
}
