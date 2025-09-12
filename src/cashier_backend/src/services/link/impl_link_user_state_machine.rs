use crate::services::gate::GateServiceTrait;
use crate::{
    repositories::Repositories,
    services::link::{service::LinkService, traits::LinkUserStateMachine},
};
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
use cashier_common::runtime::IcEnvironment;
use gate_service_types::GateStatus;

impl<E: IcEnvironment + Clone, R: Repositories, GS: GateServiceTrait> LinkUserStateMachine
    for LinkService<E, R, GS>
{
    async fn handle_user_link_state_machine(
        &mut self,
        link_id: &str,
        action_type: &ActionType,
        user_id: Principal,
        goto: &UserStateMachineGoto,
    ) -> Result<LinkAction, CanisterError> {
        // check inputs that can be changed this state
        let action_list = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, &user_id);

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

        let gate = self
            .gate_service
            .get_gate_by_link_id(link_id)
            .await
            .map_err(|e| CanisterError::HandleLogicError(format!("Failed to get gate: {e}")))?
            .map_err(|e| CanisterError::HandleLogicError(format!("Gate service error: {e}")))?;
        //

        // Check if we're in final state (CompletedLink)
        if current_user_state == LinkUserState::CompletedLink {
            return Err(CanisterError::HandleLogicError(
                "current state is final state".to_string(),
            ));
        }
        // !Start of user state machine
        //
        // Check for valid transition: Address -> CompletedLink
        else if current_user_state == LinkUserState::Address
            && *goto == UserStateMachineGoto::Continue
        {
            // if gate is existed, transition to user_state_gate_closed
            if gate.is_some() {
                // Address -> GateClosed
                new_state = LinkUserState::GateClosed;
            } else {
                // Address -> CompletedLink
                // if gate is not existed, then check the action state
                let action = self
                    .get_action_of_link(link_id, action_type, user_id)
                    .ok_or_else(|| CanisterError::NotFound("Action not found".to_string()))?;

                // Only allow transition if action state is Success
                if action.state != ActionState::Success {
                    return Err(CanisterError::HandleLogicError(
                        "Action is not success".to_string(),
                    ));
                }
                new_state = LinkUserState::CompletedLink;
            }
        } else if current_user_state == LinkUserState::GateClosed
            && *goto == UserStateMachineGoto::Continue
        {
            if gate.is_none() {
                return Err(CanisterError::HandleLogicError(
                    "Gate is not existed on GateClosed".to_string(),
                ));
            }
            let user_state = self
                .gate_service
                .get_gate_for_user(link_id, user_id)
                .await
                .map_err(|e| {
                    CanisterError::HandleLogicError(format!("calling get_gate_for_user error: {e}"))
                })?
                .map_err(|e| CanisterError::HandleLogicError(format!("Gate service error: {e}")))?;

            let Some(current_status) = user_state.gate_user_status else {
                return Err(CanisterError::HandleLogicError(
                    "Gate user status not found".to_string(),
                ));
            };

            if current_status.status != GateStatus::Closed {
                return Err(CanisterError::HandleLogicError(
                    "Gate status is not Closed".to_string(),
                ));
            }

            // TODO: open key logic here
            // TODO: transition from GateClosed to GateOpened if success
            return Err(CanisterError::NotImplemented);
        } else {
            return Err(CanisterError::HandleLogicError(format!(
                "current state {current_user_state:?} is not allowed to transition: {goto:?}"
            )));
        }
        // !End of state machine logic

        // Only update the state field
        link_action.link_user_state = Some(new_state);

        // Update in repository
        self.link_action_repository.update(link_action.clone());

        // Return the updated link_action
        Ok(link_action)
    }

    fn link_get_user_state(
        &self,
        caller: Principal,
        input: &LinkGetUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
        if input.action_type != ActionType::Use {
            return Err(CanisterError::ValidationErrors(
                "
                        Invalid action type, only Claim or Use action type is allowed
                        "
                .to_string(),
            ));
        }

        let temp_user_id = if caller != Principal::anonymous() {
            Some(caller)
        } else {
            input.anonymous_wallet_address
        };
        // Check if temp_user_id is None and return error
        let temp_user_id = temp_user_id
            .ok_or_else(|| CanisterError::ValidationErrors("User ID is required".to_string()))?;

        // Check "LinkAction" table to check records with
        // link_action link_id = input link_id
        // link_action type = input action type
        // link_action user_id = search_user_id
        let link_action =
            self.get_link_action_user(&input.link_id, &input.action_type, temp_user_id)?;

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
            link_user_state,
        }))
    }

    async fn link_update_user_state(
        &mut self,
        caller: Principal,
        input: &LinkUpdateUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
        // validate action type
        if input.action_type != ActionType::Use {
            return Err(CanisterError::ValidationErrors(
                "Invalid action type, only Claim or Use  action type is allowed".to_string(),
            ));
        }

        let temp_user_id = if caller != Principal::anonymous() {
            Some(caller)
        } else {
            input.anonymous_wallet_address
        };
        // Check if temp_user_id is None and return error
        let temp_user_id = temp_user_id
            .ok_or_else(|| CanisterError::ValidationErrors("User ID is required".to_string()))?;

        let link_action = self
            .handle_user_link_state_machine(
                &input.link_id,
                &input.action_type,
                temp_user_id,
                &input.goto,
            )
            .await?;

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
            link_user_state,
        }))
    }
}

#[cfg(test)]
mod tests {
    use std::rc::Rc;

    use super::*;
    use crate::repositories::tests::TestRepositories;
    use crate::services::link::test_fixtures::*;
    use crate::utils::test_utils::gate_service_mock::ErrorGateMock;
    use crate::utils::test_utils::{
        gate_service_mock::GateServiceMock, random_principal_id, runtime::MockIcEnvironment,
    };
    use cashier_backend_types::repository::action::v1::{Action, ActionState, ActionType};
    use gate_service_client::{CanisterClientError, IcError};
    use gate_service_types::error::GateServiceError;
    use gate_service_types::{Gate, GateKey};
    use ic_cdk::call::CallRejected;

    #[tokio::test]
    async fn it_should_error_handle_user_link_state_machine_if_link_not_found() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Continue,
            )
            .await;

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::NotFound(msg)) = result {
            assert_eq!(msg, "Link action not found");
        } else {
            panic!("Expected NotFound error");
        }
    }

    #[tokio::test]
    async fn it_should_error_handle_user_link_state_machine_if_link_state_empty() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        let _link_action =
            create_link_action_fixture(&mut service, &link.id, action_type.clone(), creator_id);

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Continue,
            )
            .await;

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(msg, "unknown state");
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[tokio::test]
    async fn it_should_error_handle_user_link_state_machine_if_link_uset_state_completed() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        let link_action =
            create_link_action_fixture(&mut service, &link.id, action_type.clone(), creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::CompletedLink),
        };
        service.link_action_repository.update(updated_link_action);

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Continue,
            )
            .await;

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(msg, "current state is final state");
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[tokio::test]
    async fn it_should_error_handle_user_link_state_machine_if_current_state_address_and_goto_continue_and_action_state_notsuccess()
     {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        let link_action =
            create_link_action_fixture(&mut service, &link.id, action_type.clone(), creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::Address),
        };
        service.link_action_repository.update(updated_link_action);

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Continue,
            )
            .await;

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(msg, "Action is not success");
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[tokio::test]
    async fn it_should_handle_user_link_state_machine_if_current_state_address_and_goto_continue() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        let link_action =
            create_link_action_fixture(&mut service, &link.id, action_type.clone(), creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::Address),
        };
        service.link_action_repository.update(updated_link_action);

        let updated_action = Action {
            id: link_action.action_id,
            r#type: ActionType::Use,
            state: ActionState::Success,
            creator: creator_id,
            link_id: link.id.clone(),
        };
        service.action_repository.update(updated_action);

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Continue,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let link_action = result.unwrap();
        assert_eq!(
            link_action.link_user_state,
            Some(LinkUserState::CompletedLink)
        );
    }

    #[tokio::test]
    async fn it_should_handle_user_link_state_machine_if_gate_exists_and_goto_continue() {
        // Arrange
        let gate_mock = GateServiceMock::new();

        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            gate_mock,
        );

        // We need ownership of the gate mock to add a gate before constructing the service.
        // Create a new gate and add it to the mock so get_gate_by_link_id will return Some(gate).
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        let link_action =
            create_link_action_fixture(&mut service, &link.id, action_type.clone(), creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::Address),
        };
        service.link_action_repository.update(updated_link_action);

        // Add gate matching the link id so gate_service returns Some(gate)
        let gate = Gate {
            id: "gate_1".to_string(),
            creator: creator_id,
            subject_id: link.id.clone(),
            key: GateKey::PasswordRedacted,
        };

        // GateServiceMock was moved into the service; retrieve a mutable reference to it by
        // replacing the gate_service in the service with a new mock that has the gate.
        // Create a new mock, add the gate, and set it on the service.
        let mut seeded_mock = crate::utils::test_utils::gate_service_mock::GateServiceMock::new();
        seeded_mock.add_test_gate(gate);
        service.gate_service = seeded_mock;

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Continue,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let link_action = result.unwrap();
        assert_eq!(link_action.link_user_state, Some(LinkUserState::GateClosed));
    }

    #[tokio::test]
    async fn it_should_error_handle_user_link_state_machine_if_gate_service_errors() {
        let error_gate_mock =
            ErrorGateMock::new().with_service_error(|| GateServiceError::Unauthorized);
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            error_gate_mock,
        );

        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        let link_action =
            create_link_action_fixture(&mut service, &link.id, action_type.clone(), creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::Address),
        };
        service.link_action_repository.update(updated_link_action);

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Continue,
            )
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("Unauthorized access"));
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[tokio::test]
    async fn it_should_handle_canister_call_failed_from_gate_service() {
        // Arrange
        let error_gate_mock = ErrorGateMock::new().with_canister_error(|| {
            CanisterClientError::CanisterError(IcError::CallRejected(CallRejected::with_rejection(
                10,
                "subnet is downed".to_string(),
            )))
        });
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            error_gate_mock,
        );

        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        let link_action =
            create_link_action_fixture(&mut service, &link.id, action_type.clone(), creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::Address),
        };
        service.link_action_repository.update(updated_link_action);

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Continue,
            )
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert!(msg.contains("subnet is downed"));
        } else {
            panic!("Expected HandleLogicError due to canister call failure");
        }
    }

    #[tokio::test]
    async fn it_should_error_handle_user_link_state_machine_otherwise() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let action_type = ActionType::Use;

        let link_action =
            create_link_action_fixture(&mut service, &link.id, action_type.clone(), creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::Address),
        };
        service.link_action_repository.update(updated_link_action);

        // Act
        let result = service
            .handle_user_link_state_machine(
                &link.id,
                &action_type,
                creator_id,
                &UserStateMachineGoto::Back,
            )
            .await;

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(
                msg,
                format!(
                    "current state {:?} is not allowed to transition: {:?}",
                    LinkUserState::Address,
                    UserStateMachineGoto::Back
                )
            );
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_error_link_get_user_state_if_action_type_invalid() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator = random_principal_id();
        let link = create_link_fixture(&mut service, creator);

        // Act
        let result = service.link_get_user_state(
            creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: ActionType::CreateLink,
                anonymous_wallet_address: None,
            },
        );

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid action type, only Claim or Use action type is allowed"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_error_link_get_user_state_if_action_type_invalid_format() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator = random_principal_id();
        let link = create_link_fixture(&mut service, creator);

        // Act
        let result = service.link_get_user_state(
            creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: ActionType::CreateLink,
                anonymous_wallet_address: None,
            },
        );

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid action type"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_get_user_state_if_link_action_not_found() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator = random_principal_id();
        let link = create_link_fixture(&mut service, creator);

        // Act
        let result = service.link_get_user_state(
            creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: ActionType::Use,
                anonymous_wallet_address: None,
            },
        );

        // Assert
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.is_none());
    }

    #[test]
    fn it_should_error_link_get_user_state_if_link_user_state_not_found() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator = random_principal_id();
        let link = create_link_fixture(&mut service, creator);
        let link_action =
            create_link_action_fixture(&mut service, &link.id, ActionType::Use, creator);

        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: None,
        };
        service.link_action_repository.update(updated_link_action);

        // Act
        let result = service.link_get_user_state(
            creator,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: ActionType::Use,
                anonymous_wallet_address: None,
            },
        );

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::HandleLogicError(msg)) = result {
            assert_eq!(msg, "Link user state is not found");
        } else {
            panic!("Expected HandleLogicError");
        }
    }

    #[test]
    fn it_should_link_get_user_state_if_link_action_found() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let link_action =
            create_link_action_fixture(&mut service, &link.id, ActionType::Use, creator_id);
        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::Address),
        };
        service.link_action_repository.update(updated_link_action);

        // Act
        let result = service.link_get_user_state(
            creator_id,
            &LinkGetUserStateInput {
                link_id: link.id,
                action_type: ActionType::Use,
                anonymous_wallet_address: None,
            },
        );

        // Assert
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.is_some());
        let output = output.unwrap();
        assert_eq!(output.link_user_state, LinkUserState::Address);
        assert_eq!(output.action.creator, creator_id);
    }

    #[tokio::test]
    async fn it_should_error_link_update_user_state_if_action_type_invalid() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);

        // Act
        let result = service
            .link_update_user_state(
                creator_id,
                &LinkUpdateUserStateInput {
                    link_id: link.id,
                    action_type: ActionType::CreateLink,
                    goto: UserStateMachineGoto::Continue,
                    anonymous_wallet_address: None,
                },
            )
            .await;

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid action type, only Claim or Use  action type is allowed"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[tokio::test]
    async fn it_should_error_link_update_user_state_if_action_type_invalid_format() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);

        // Act
        let result = service
            .link_update_user_state(
                creator_id,
                &LinkUpdateUserStateInput {
                    link_id: link.id,
                    action_type: ActionType::CreateLink,
                    goto: UserStateMachineGoto::Continue,
                    anonymous_wallet_address: None,
                },
            )
            .await;

        // Assert
        assert!(result.is_err());

        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(msg.contains("Invalid action type"));
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[tokio::test]
    async fn it_should_link_update_user_state() {
        // Arrange
        let mut service = LinkService::new(
            Rc::new(TestRepositories::new()),
            MockIcEnvironment::new(),
            GateServiceMock::new(),
        );
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let link_action =
            create_link_action_fixture(&mut service, &link.id, ActionType::Use, creator_id);

        let updated_link_action = LinkAction {
            link_id: link_action.link_id.clone(),
            action_type: link_action.action_type.clone(),
            action_id: link_action.action_id.clone(),
            user_id: link_action.user_id,
            link_user_state: Some(LinkUserState::Address),
        };
        service.link_action_repository.update(updated_link_action);

        let updated_action = Action {
            id: link_action.action_id,
            r#type: ActionType::Use,
            state: ActionState::Success,
            creator: creator_id,
            link_id: link.id.clone(),
        };
        service.action_repository.update(updated_action);

        // Act
        let result = service
            .link_update_user_state(
                creator_id,
                &LinkUpdateUserStateInput {
                    link_id: link.id,
                    action_type: ActionType::Use,
                    goto: UserStateMachineGoto::Continue,
                    anonymous_wallet_address: None,
                },
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.is_some());
        let output = output.unwrap();
        assert_eq!(output.link_user_state, LinkUserState::CompletedLink);
        assert_eq!(output.action.creator, creator_id);
    }
}
