use crate::{
    services::link::{service::LinkService, traits::LinkUserStateMachine},
    utils::runtime::IcEnvironment,
};
use std::str::FromStr;

use candid::Principal;
use cashier_backend_types::{
    dto::{
        action::ActionDto,
        link::{
            LinkGetUserStateInput, LinkGetUserStateOutput, LinkUpdateUserStateInput,
            UserStateMachineGoto,
        },
    },
    error::CanisterError,
    repository::{
        action::v1::{ActionState, ActionType},
        link_action::v1::{LinkAction, LinkUserState},
    },
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

        let Some(mut link_action) = action_list.first().cloned() else {
            return Err(CanisterError::NotFound("Link action not found".to_string()));
        };

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
                "current state {current_user_state:?} is not allowed to transition: {goto:?}"
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
            self.user_service.get_user_id_by_wallet(caller)
        } else {
            input
                .anonymous_wallet_address
                .as_ref()
                .map(|addr| format!("ANON#{addr}"))
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
            .map_err(|e| CanisterError::HandleLogicError(format!("Failed to get action: {e}")))?;

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
                .map(|addr| format!("ANON#{addr}"))
        };
        // Check if temp_user_id is None and return error
        let temp_user_id = temp_user_id
            .ok_or_else(|| CanisterError::ValidationErrors("User ID is required".to_string()))?;

        let goto = UserStateMachineGoto::from_str(&input.goto)
            .map_err(|e| CanisterError::ValidationErrors(format!("Invalid goto: {e}")))?;

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
            .map_err(|e| CanisterError::HandleLogicError(format!("Failed to get action: {e}")))?;

        Ok(Some(LinkGetUserStateOutput {
            action: ActionDto::from_with_tx(action.action, action.intents, &action.intent_txs),
            link_user_state: link_user_state.to_string(),
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::link::test_fixtures::*;
    use crate::utils::test_utils::{random_principal_id, runtime::MockIcEnvironment};
    use cashier_backend_types::repository::action::v1::{Action, ActionState, ActionType};

    #[test]
    fn it_should_error_handle_user_link_state_machine_if_link_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_fixture(&service, &creator_id);
        let action_type = "Use";

        let result = service.handle_user_link_state_machine(
            &link.id,
            action_type,
            &creator_id,
            &UserStateMachineGoto::Continue,
        );

        assert!(result.is_err());

        if let Err(CanisterError::NotFound(msg)) = result {
            assert_eq!(msg, "Link action not found");
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[test]
    fn it_should_error_handle_user_link_state_machine_if_link_state_empty() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_fixture(&service, &creator_id);
        let action_type = "Use";

        let _link_action = create_link_action_fixture(&service, &link.id, action_type, &creator_id);

        let result = service.handle_user_link_state_machine(
            &link.id,
            action_type,
            &creator_id,
            &UserStateMachineGoto::Continue,
        );

        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(msg, "unknown state");
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_error_handle_user_link_state_machine_if_link_uset_state_completed() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_fixture(&service, &creator_id);
        let action_type = "Use";

        let link_action = create_link_action_fixture(&service, &link.id, action_type, &creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::CompletedLink),
        };
        service.link_action_repository.update(updated_link_action);

        let result = service.handle_user_link_state_machine(
            &link.id,
            action_type,
            &creator_id,
            &UserStateMachineGoto::Continue,
        );

        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(msg, "current state is final state");
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_error_handle_user_link_state_machine_if_current_state_choose_wallet_and_goto_continue_and_action_state_notsuccess()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_fixture(&service, &creator_id);
        let action_type = "Use";

        let link_action = create_link_action_fixture(&service, &link.id, action_type, &creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::ChooseWallet),
        };
        service.link_action_repository.update(updated_link_action);

        let result = service.handle_user_link_state_machine(
            &link.id,
            action_type,
            &creator_id,
            &UserStateMachineGoto::Continue,
        );

        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(msg, "Action is not success");
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_handle_user_link_state_machine_if_current_state_choose_wallet_and_goto_continue() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_fixture(&service, &creator_id);
        let action_type = "Use";

        let link_action = create_link_action_fixture(&service, &link.id, action_type, &creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id.clone(),
            link_user_state: Some(LinkUserState::ChooseWallet),
        };
        service.link_action_repository.update(updated_link_action);

        let updated_action = Action {
            id: link_action.action_id,
            r#type: ActionType::Use,
            state: ActionState::Success,
            creator: creator_id.clone(),
            link_id: link.id.clone(),
        };
        service.action_repository.update(updated_action);

        let result = service.handle_user_link_state_machine(
            &link.id,
            action_type,
            &creator_id,
            &UserStateMachineGoto::Continue,
        );

        assert!(result.is_ok());
        let link_action = result.unwrap();
        assert_eq!(
            link_action.link_user_state,
            Some(LinkUserState::CompletedLink)
        );
    }

    #[test]
    fn it_should_error_handle_user_link_state_machine_otherwise() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_fixture(&service, &creator_id);
        let action_type = "Use";

        let link_action = create_link_action_fixture(&service, &link.id, action_type, &creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::ChooseWallet),
        };
        service.link_action_repository.update(updated_link_action);

        let result = service.handle_user_link_state_machine(
            &link.id,
            action_type,
            &creator_id,
            &UserStateMachineGoto::Back,
        );

        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(
                msg,
                format!(
                    "current state {:?} is not allowed to transition: {:?}",
                    LinkUserState::ChooseWallet,
                    UserStateMachineGoto::Back
                )
            );
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_error_link_get_user_state_if_action_type_invalid() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);

        let result = service.link_get_user_state(
            &creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: "CreateLink".to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid action type, only Claim or Use action type is allowed"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_error_link_get_user_state_if_action_type_invalid_format() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);

        let result = service.link_get_user_state(
            &creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: "InvalidActionType".to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid action type"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_error_link_get_user_state_if_user_id_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator2 = Principal::from_text(random_principal_id()).unwrap();
        let link = create_link_fixture(&service, &creator_id);

        let result = service.link_get_user_state(
            &creator2,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: "Use".to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert_eq!(msg, "User ID is required");
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_get_user_state_if_link_action_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);
        let _user_wallet = create_user_wallet_fixture(&service, &creator_id, &creator_id);

        let result = service.link_get_user_state(
            &creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: "Use".to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.is_none());
    }

    #[test]
    fn it_should_error_link_get_user_state_if_link_user_state_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);
        let _user_wallet = create_user_wallet_fixture(&service, &creator_id, &creator_id);
        let link_action = create_link_action_fixture(&service, &link.id, "Use", &creator_id);

        // Update link action without setting link_user_state
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: None,
        };
        service.link_action_repository.update(updated_link_action);

        let result = service.link_get_user_state(
            &creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: "Use".to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(msg, "Link user state is not found");
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_link_get_user_state_if_link_action_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);
        let _user_wallet = create_user_wallet_fixture(&service, &creator_id, &creator_id);
        let link_action = create_link_action_fixture(&service, &link.id, "Use", &creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::ChooseWallet),
        };
        service.link_action_repository.update(updated_link_action);

        let result = service.link_get_user_state(
            &creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: "Use".to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.is_some());
        let output = output.unwrap();
        assert_eq!(
            output.link_user_state,
            LinkUserState::ChooseWallet.to_string()
        );
        assert_eq!(output.action.creator, creator_id);
    }

    #[test]
    fn it_should_error_link_update_user_state_if_action_type_invalid() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);

        let result = service.link_update_user_state(
            &creator,
            &LinkUpdateUserStateInput {
                link_id: link.id,
                action_type: "CreateLink".to_string(),
                goto: UserStateMachineGoto::Continue.to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid action type, only Claim or Use  action type is allowed"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_error_link_update_user_state_if_action_type_invalid_format() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);

        let result = service.link_update_user_state(
            &creator,
            &LinkUpdateUserStateInput {
                link_id: link.id,
                action_type: "InvalidActionType".to_string(),
                goto: UserStateMachineGoto::Continue.to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid action type"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_error_link_update_user_state_if_user_id_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator2 = Principal::from_text(random_principal_id()).unwrap();
        let link = create_link_fixture(&service, &creator_id);

        let result = service.link_update_user_state(
            &creator2,
            &LinkUpdateUserStateInput {
                link_id: link.id,
                action_type: "Use".to_string(),
                goto: UserStateMachineGoto::Continue.to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert_eq!(msg, "User ID is required");
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_update_user_state_if_goto_invalid() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);
        let _user_wallet = create_user_wallet_fixture(&service, &creator_id, &creator_id);

        let result = service.link_update_user_state(
            &creator,
            &LinkUpdateUserStateInput {
                link_id: link.id,
                action_type: "Use".to_string(),
                goto: "InvalidGoto".to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid goto"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_update_user_state() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let creator = Principal::from_text(creator_id.clone()).unwrap();
        let link = create_link_fixture(&service, &creator_id);
        let _user_wallet = create_user_wallet_fixture(&service, &creator_id, &creator_id);
        let link_action = create_link_action_fixture(&service, &link.id, "Use", &creator_id);

        // Update link action without setting link_user_state
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id.clone(),
            link_user_state: Some(LinkUserState::ChooseWallet),
        };
        service.link_action_repository.update(updated_link_action);

        let updated_action = Action {
            id: link_action.action_id,
            r#type: ActionType::Use,
            state: ActionState::Success,
            creator: creator_id.clone(),
            link_id: link.id.clone(),
        };
        service.action_repository.update(updated_action);

        let result = service.link_update_user_state(
            &creator,
            &LinkUpdateUserStateInput {
                link_id: link.id,
                action_type: "Use".to_string(),
                goto: UserStateMachineGoto::Continue.to_string(),
                anonymous_wallet_address: None,
            },
        );

        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.is_some());
        let output = output.unwrap();
        assert_eq!(
            output.link_user_state,
            LinkUserState::CompletedLink.to_string()
        );
        assert_eq!(output.action.creator, creator_id);
    }
}
