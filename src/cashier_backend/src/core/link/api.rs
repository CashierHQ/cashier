// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use std::str::FromStr;

use candid::Principal;
use cashier_types::{ActionState, ActionType, LinkUserState};
use ic_cdk::{query, update};
use uuid::Uuid;

use crate::{
    core::{
        action::types::{
            ActionDto, CreateActionInput, ProcessActionAnonymousInput, ProcessActionInput,
        },
        guard::is_not_anonymous,
        GetLinkOptions, GetLinkResp, LinkDto, PaginateResult, UpdateLinkInput,
    },
    error, info,
    services::{
        self,
        action::ActionService,
        link::v2::LinkService,
        transaction_manager::{
            validate::ValidateService, TransactionManagerService, UpdateActionArgs,
        },
        user::v2::UserService,
    },
    types::{api::PaginateInput, error::CanisterError, temp_action::TemporaryAction},
    utils::runtime::{IcEnvironment, RealIcEnvironment},
};

use super::types::{
    CreateLinkInput, CreateLinkInputV2, LinkGetUserStateInput, LinkGetUserStateOutput,
    LinkUpdateUserStateInput, UpdateActionInput, UserStateMachineGoto,
};

#[query(guard = "is_not_anonymous")]
async fn get_links(input: Option<PaginateInput>) -> Result<PaginateResult<LinkDto>, String> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.get_links(input)
}

#[query]
async fn get_link(id: String, options: Option<GetLinkOptions>) -> Result<GetLinkResp, String> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.get_link(id, options)
}

#[update(guard = "is_not_anonymous")]
async fn create_link(input: CreateLinkInput) -> Result<String, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.create_link(input)
}

#[update(guard = "is_not_anonymous")]
async fn create_link_v2(input: CreateLinkInputV2) -> Result<LinkDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.create_link_v2(input).await
}

#[update(guard = "is_not_anonymous")]
async fn update_link(input: UpdateLinkInput) -> Result<LinkDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.update_link(input).await
}

#[update(guard = "is_not_anonymous")]
pub async fn process_action(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.process_action(input).await
}

#[update(guard = "is_not_anonymous")]
pub async fn process_action_v2(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.process_action_v2(input).await
}

#[update(guard = "is_not_anonymous")]
pub fn create_action(input: CreateActionInput) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.create_action(input)
}

#[update]
pub async fn process_action_anonymous(
    input: ProcessActionAnonymousInput,
) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.process_action_anonymous(input).await
}

#[update]
pub fn create_action_anonymous(
    input: ProcessActionAnonymousInput,
) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.create_action_anonymous(input)
}

#[update]
pub async fn process_action_anonymous_v2(
    input: ProcessActionAnonymousInput,
) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.process_action_anonymous_v2(input).await
}

#[update]
pub async fn link_get_user_state(
    input: LinkGetUserStateInput,
) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.link_get_user_state(input)
}

#[update]
pub async fn link_update_user_state(
    input: LinkUpdateUserStateInput,
) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.link_update_user_state(input)
}

#[update(guard = "is_not_anonymous")]
pub async fn update_action(input: UpdateActionInput) -> Result<ActionDto, CanisterError> {
    let start = ic_cdk::api::time();
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    let res = api.update_action(input).await;

    let end = ic_cdk::api::time();

    let elapsed = end - start;
    let elapsed_seconds = (elapsed as f64) / 1_000_000_000.0;
    info!("[update_action] elapsed time: {} seconds", elapsed_seconds);

    res
}

pub struct LinkApi<E: IcEnvironment + Clone> {
    link_service: LinkService<E>,
    user_service: UserService,
    tx_manager_service: TransactionManagerService<E>,
    action_service: ActionService<E>,
    ic_env: E,
    validate_service: ValidateService,
}

impl<E: IcEnvironment + Clone> LinkApi<E> {
    pub fn get_instance() -> Self {
        Self {
            link_service: LinkService::get_instance(),
            user_service: UserService::get_instance(),
            tx_manager_service: TransactionManagerService::get_instance(),
            action_service: ActionService::get_instance(),
            ic_env: E::new(),
            validate_service: ValidateService::get_instance(),
        }
    }

    pub fn new(
        link_service: LinkService<E>,
        user_service: UserService,
        tx_manager_service: TransactionManagerService<E>,
        action_service: ActionService<E>,
        ic_env: E,
        validate_service: ValidateService,
    ) -> Self {
        Self {
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
            validate_service,
        }
    }

    /// Get links created by the caller
    pub fn get_links(
        &self,
        input: Option<PaginateInput>,
    ) -> Result<PaginateResult<LinkDto>, String> {
        let caller = self.ic_env.caller();

        match self
            .link_service
            .get_links_by_principal(caller.to_text(), input.unwrap_or_default())
        {
            Ok(links) => Ok(links.map(|link| LinkDto::from(link))),
            Err(e) => {
                error!("Failed to get links: {}", e);
                Err(e)
            }
        }
    }

    pub fn get_link(
        &self,
        id: String,
        options: Option<GetLinkOptions>,
    ) -> Result<GetLinkResp, String> {
        let caller = self.ic_env.caller();

        let user_id = self.user_service.get_user_id_by_wallet(&caller);

        // Allow both anonymous callers and non-anonymous callers without user IDs to proceed

        let is_valid_creator = if !(caller == Principal::anonymous()) {
            self.link_service.is_link_creator(caller.to_text(), &id)
        } else {
            false // Anonymous callers can't be creators
        };

        // Extract action_type from options
        let action_type = match options {
            Some(options) => ActionType::from_str(&options.action_type)
                .map_err(|_| "Invalid action type".to_string())
                .map(Some)?,
            None => None,
        };

        // Handle different action types based on permissions
        let action_type = match action_type {
            // For CreateLink or Withdraw, require creator permission
            Some(ActionType::CreateLink) | Some(ActionType::Withdraw) => {
                if !is_valid_creator {
                    return Err("Only creator can access this action type".to_string());
                }
                action_type
            }
            // For Claim, don't return the action (handled separately)
            Some(ActionType::Use) => None,
            // For other types, pass through
            _ => action_type,
        };

        // Get link and action data
        let link = match self.link_service.get_link_by_id(id.clone()) {
            Ok(link) => link,
            Err(e) => return Err(e.to_string()),
        };

        // Get action data (only if user_id exists)
        let action = match (action_type, &user_id) {
            (Some(action_type), Some(user_id)) => {
                self.link_service
                    .get_link_action(id, action_type.to_string(), user_id.clone())
            }
            _ => None,
        };

        let action_dto = action.map(|action| {
            let intents = services::action::get_intents_by_action_id(action.id.clone());
            ActionDto::from(action, intents)
        });

        Ok(GetLinkResp {
            link: LinkDto::from(link),
            action: action_dto,
        })
    }

    /// Create a new link
    pub fn create_link(&self, input: CreateLinkInput) -> Result<String, CanisterError> {
        let creator = self.ic_env.caller();

        match self.link_service.create_new(creator.to_text(), input) {
            Ok(id) => Ok(id),
            Err(e) => {
                error!("Failed to create link: {}", e);
                Err(CanisterError::HandleLogicError(e))
            }
        }
    }

    pub async fn create_link_v2(&self, input: CreateLinkInputV2) -> Result<LinkDto, CanisterError> {
        let creator = self.ic_env.caller();

        match self
            .link_service
            .create_new_v2(creator.to_text(), input)
            .await
        {
            Ok(link) => Ok(LinkDto::from(link)),
            Err(e) => {
                error!("Failed to create link: {}", e);
                Err(e)
            }
        }
    }

    pub async fn process_action_anonymous(
        &self,
        input: ProcessActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError> {
        let start = ic_cdk::api::time();
        let caller = self.ic_env.caller();

        if caller != Principal::anonymous() {
            return Err(CanisterError::ValidationErrors(
                "Only anonymous caller can call this function".to_string(),
            ));
        }

        // check wallet address
        let wallet_address = match Principal::from_text(input.wallet_address.clone()) {
            Ok(wa) => wa,
            Err(_) => {
                return Err(CanisterError::ValidationErrors(
                    "Invalid wallet address".to_string(),
                ));
            }
        };

        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors(format!("Invalid action type ")))?;

        // check action type is claim
        if action_type != ActionType::Use {
            return Err(CanisterError::ValidationErrors(
                "Invalid action type, only Claim or Use action type is allowed".to_string(),
            ));
        }

        // add prefix for easy query
        let user_id = format!("ANON#{}", input.wallet_address);

        let action =
            self.link_service
                .get_action_of_link(&input.link_id, &input.action_type, &user_id);

        // if action is not found, create a new action
        // only allow == action type
        let res = if action.is_none() {
            // validate create action
            self.link_service.link_validate_user_create_action(
                &input.link_id,
                &action_type,
                &user_id,
            )?;

            //create temp action
            // fill in link_id info
            // fill in action_type info
            // fill in default_link_user_state info
            let default_link_user_state = match action_type {
                ActionType::Use => Some(LinkUserState::ChooseWallet),
                _ => None,
            };
            let mut temp_action = TemporaryAction {
                id: Uuid::new_v4().to_string(),
                r#type: action_type,
                state: ActionState::Created,
                creator: user_id.clone(),
                link_id: input.link_id.clone(),
                intents: vec![],
                default_link_user_state,
            };

            // fill the intent info
            let intents = self
                .link_service
                .assemble_intents(&temp_action.link_id, &temp_action.r#type, &wallet_address)
                .map_err(|e| {
                    CanisterError::HandleLogicError(format!(
                        "[process_action_anonymous] Failed to assemble intents: {}",
                        e
                    ))
                })?;
            temp_action.intents = intents;

            info!("temp_action: {:#?}", temp_action);

            // create real action
            let res = self.tx_manager_service.create_action(&temp_action)?;

            info!(
                "[process_action_anonymous] user_id: {:?}, link_id: {:?}, action_id: {:?}",
                &user_id, input.link_id, res.id
            );

            Ok(res)
        } else {
            // validate action
            self.link_service
                .link_validate_user_update_action(&action.as_ref().unwrap(), &user_id)?;

            let action_id = action.unwrap().id.clone();

            info!(
                "[process_action_anonymous] user_id: {:?}, link_id: {:?}, action_id: {:?}",
                &user_id, input.link_id, action_id
            );

            // execute action with our standalone callback
            let update_action_res = self
                .tx_manager_service
                .update_action(UpdateActionArgs {
                    action_id: action_id.clone(),
                    link_id: input.link_id.clone(),
                    execute_wallet_tx: false,
                })
                .await?;

            Ok(update_action_res)
        };

        let end = ic_cdk::api::time();
        let elapsed = end - start;
        let elapsed_seconds = (elapsed as f64) / 1_000_000_000.0;
        info!(
            "[process_action_anonymous] elapsed time: {} seconds",
            elapsed_seconds
        );

        res
    }

    pub async fn process_action_anonymous_v2(
        &self,
        input: ProcessActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError> {
        let start = ic_cdk::api::time();
        let caller = self.ic_env.caller();

        if caller != Principal::anonymous() {
            return Err(CanisterError::ValidationErrors(
                "Only anonymous caller can call this function".to_string(),
            ));
        }

        // check wallet address
        let wallet_address = match Principal::from_text(input.wallet_address.clone()) {
            Ok(wa) => wa,
            Err(_) => {
                return Err(CanisterError::ValidationErrors(
                    "Invalid wallet address".to_string(),
                ));
            }
        };

        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors(format!("Invalid action type ")))?;

        // check action type is claim
        if action_type != ActionType::Use {
            return Err(CanisterError::ValidationErrors(
                "Invalid action type, only Claim or Use action type is allowed".to_string(),
            ));
        }

        // add prefix for easy query
        let user_id = format!("ANON#{}", input.wallet_address);

        let action =
            self.link_service
                .get_action_of_link(&input.link_id, &input.action_type, &user_id);

        if action.is_none() {
            return Err(CanisterError::ValidationErrors(format!(
                "Action is not existed"
            )));
        }

        // validate action
        self.link_service
            .link_validate_user_update_action(&action.as_ref().unwrap(), &user_id)?;

        let action_id = action.unwrap().id.clone();

        info!(
            "[process_action_anonymous_v2] user_id: {:?}, link_id: {:?}, action_id: {:?}",
            &user_id, input.link_id, action_id
        );

        // execute action with our standalone callback
        let update_action_res = self
            .tx_manager_service
            .update_action(UpdateActionArgs {
                action_id: action_id.clone(),
                link_id: input.link_id.clone(),
                execute_wallet_tx: false,
            })
            .await?;

        let end = ic_cdk::api::time();
        let elapsed = end - start;
        let elapsed_seconds = (elapsed as f64) / 1_000_000_000.0;
        info!(
            "[process_action_anonymous_v2] elapsed time: {} seconds",
            elapsed_seconds
        );

        Ok(update_action_res)
    }

    pub async fn process_action(
        &self,
        input: ProcessActionInput,
    ) -> Result<ActionDto, CanisterError> {
        let start = ic_cdk::api::time();
        let caller = self.ic_env.caller();

        // input validate
        let user_id = self.user_service.get_user_id_by_wallet(&caller);

        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors(format!("Invalid action type ")))?;

        // basic validations
        if user_id.is_none() {
            return Err(CanisterError::ValidationErrors(
                "User not found".to_string(),
            ));
        }

        let action = self.link_service.get_action_of_link(
            &input.link_id,
            &input.action_type,
            &user_id.as_ref().unwrap(),
        );

        info!(
            "[process_action 402] user_id: {:?}, link_id: {:?}, action_type: {:?}",
            user_id, input.link_id, action_type
        );

        let res = if action.is_none() {
            self.link_service.link_validate_user_create_action(
                &input.link_id,
                &action_type,
                user_id.as_ref().unwrap(),
            )?;
            //create temp action
            // fill in link_id info
            // fill in action_type info
            // fill in default_link_user_state info
            let default_link_user_state = match action_type {
                ActionType::Use => Some(LinkUserState::ChooseWallet),
                _ => None,
            };
            let mut temp_action = TemporaryAction {
                id: Uuid::new_v4().to_string(),
                r#type: action_type,
                state: ActionState::Created,
                creator: user_id.as_ref().unwrap().to_string(),
                link_id: input.link_id.clone(),
                intents: vec![],
                default_link_user_state,
            };

            let caller = self.ic_env.caller();

            // fill the intent info
            let intents = self
                .link_service
                .assemble_intents(&temp_action.link_id, &temp_action.r#type, &caller)
                .map_err(|e| {
                    CanisterError::HandleLogicError(format!(
                        "[process_action] Failed to assemble intents: {}",
                        e
                    ))
                })?;
            temp_action.intents = intents;

            // create real action
            let res = self.tx_manager_service.create_action(&temp_action)?;

            info!(
                "[process_action] user_id: {:?}, link_id: {:?}, action_id: {:?}",
                user_id, input.link_id, res.id
            );

            Ok(res)
        } else {
            self.link_service.link_validate_user_update_action(
                &action.clone().unwrap(),
                user_id.as_ref().unwrap(),
            )?;
            let action_id = action.clone().unwrap().id.clone();

            // execute action
            let update_action_res = self
                .tx_manager_service
                .update_action(UpdateActionArgs {
                    action_id: action_id.clone(),
                    link_id: input.link_id.clone(),
                    execute_wallet_tx: false,
                })
                .await?;

            Ok(update_action_res)
        };

        let end = ic_cdk::api::time();
        let elapsed = end - start;
        let elapsed_seconds = (elapsed as f64) / 1_000_000_000.0;
        info!("[process_action] elapsed time: {} seconds", elapsed_seconds);

        res
    }

    pub async fn process_action_v2(
        &self,
        input: ProcessActionInput,
    ) -> Result<ActionDto, CanisterError> {
        let start = ic_cdk::api::time();
        let caller = self.ic_env.caller();

        // input validate
        let user_id = self.user_service.get_user_id_by_wallet(&caller);

        let _ = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors(format!("Invalid action type ")))?;

        // basic validations
        if user_id.is_none() {
            return Err(CanisterError::ValidationErrors(
                "User not found".to_string(),
            ));
        }

        let action = self.link_service.get_action_of_link(
            &input.link_id,
            &input.action_type,
            &user_id.as_ref().unwrap(),
        );

        let res = if action.is_none() {
            Err(CanisterError::ValidationErrors(format!(
                "Action is not existed"
            )))
        } else {
            self.link_service.link_validate_user_update_action(
                &action.clone().unwrap(),
                user_id.as_ref().unwrap(),
            )?;
            let action_id = action.clone().unwrap().id.clone();

            // execute action
            let update_action_res = self
                .tx_manager_service
                .update_action(UpdateActionArgs {
                    action_id: action_id.clone(),
                    link_id: input.link_id.clone(),
                    execute_wallet_tx: false,
                })
                .await?;

            Ok(update_action_res)
        };

        let end = ic_cdk::api::time();
        let elapsed = end - start;
        let elapsed_seconds = (elapsed as f64) / 1_000_000_000.0;
        info!("[process_action] elapsed time: {} seconds", elapsed_seconds);

        res
    }

    pub fn create_action(&self, input: CreateActionInput) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();

        // input validate
        let user_id = self.user_service.get_user_id_by_wallet(&caller);

        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors(format!("Invalid action type ")))?;

        // basic validations
        if user_id.is_none() {
            return Err(CanisterError::ValidationErrors(
                "User not found".to_string(),
            ));
        }

        let action = self.link_service.get_action_of_link(
            &input.link_id,
            &input.action_type,
            &user_id.as_ref().unwrap(),
        );

        if action.is_some() {
            return Err(CanisterError::ValidationErrors(format!(
                "Action already exist!"
            )));
        }

        self.link_service.link_validate_user_create_action(
            &input.link_id,
            &action_type,
            user_id.as_ref().unwrap(),
        )?;

        //create temp action
        // fill in link_id info
        // fill in action_type info
        // fill in default_link_user_state info
        let default_link_user_state = match action_type {
            ActionType::Use => Some(LinkUserState::ChooseWallet),
            _ => None,
        };
        let mut temp_action = TemporaryAction {
            id: Uuid::new_v4().to_string(),
            r#type: action_type,
            state: ActionState::Created,
            creator: user_id.as_ref().unwrap().to_string(),
            link_id: input.link_id.clone(),
            intents: vec![],
            default_link_user_state,
        };

        let caller = self.ic_env.caller();

        // fill the intent info
        let intents = self
            .link_service
            .assemble_intents(&temp_action.link_id, &temp_action.r#type, &caller)
            .map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "[create_action] Failed to assemble intents: {}",
                    e
                ))
            })?;
        temp_action.intents = intents;

        // create real action
        let res = self.tx_manager_service.create_action(&temp_action)?;

        Ok(res)
    }

    pub fn create_action_anonymous(
        &self,
        input: ProcessActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();

        if caller != Principal::anonymous() {
            return Err(CanisterError::ValidationErrors(
                "Only anonymous caller can call this function".to_string(),
            ));
        }

        // check wallet address
        let wallet_address = match Principal::from_text(input.wallet_address.clone()) {
            Ok(wa) => wa,
            Err(_) => {
                return Err(CanisterError::ValidationErrors(
                    "Invalid wallet address".to_string(),
                ));
            }
        };

        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors(format!("Invalid action type")))?;

        // check action type is claim
        if action_type != ActionType::Use {
            return Err(CanisterError::ValidationErrors(
                "Invalid action type, only Claim or Use action type is allowed".to_string(),
            ));
        }

        // add prefix for easy query
        let user_id = format!("ANON#{}", input.wallet_address);

        let action =
            self.link_service
                .get_action_of_link(&input.link_id, &input.action_type, &user_id);

        if action.is_some() {
            return Err(CanisterError::ValidationErrors(format!(
                "Action already exist!"
            )));
        }

        self.link_service.link_validate_user_create_action(
            &input.link_id,
            &action_type,
            &user_id,
        )?;

        //create temp action
        // fill in link_id info
        // fill in action_type info
        // fill in default_link_user_state info
        let default_link_user_state = match action_type {
            ActionType::Use => Some(LinkUserState::ChooseWallet),
            _ => None,
        };
        let mut temp_action = TemporaryAction {
            id: Uuid::new_v4().to_string(),
            r#type: action_type,
            state: ActionState::Created,
            creator: user_id.clone(),
            link_id: input.link_id.clone(),
            intents: vec![],
            default_link_user_state,
        };

        // fill the intent info
        let intents = self
            .link_service
            .assemble_intents(&temp_action.link_id, &temp_action.r#type, &wallet_address)
            .map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "[create_action_anonymous] Failed to assemble intents: {}",
                    e
                ))
            })?;
        temp_action.intents = intents;

        info!("temp_action: {:#?}", temp_action);

        // create real action
        let res = self.tx_manager_service.create_action(&temp_action)?;

        info!(
            "[create_action_anonymous] user_id: {:?}, link_id: {:?}, action_id: {:?}",
            &user_id, input.link_id, res.id
        );

        Ok(res)
    }

    pub fn link_get_user_state(
        &self,
        input: LinkGetUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
        let caller = self.ic_env.caller();

        let mut temp_user_id = match caller != Principal::anonymous() {
            true => self.user_service.get_user_id_by_wallet(&caller),
            false => None,
        };

        // Validation
        // cannot have both session key & anonymous_wallet_address
        if temp_user_id.is_some() && input.anonymous_wallet_address.is_some() {
            return Err(CanisterError::ValidationErrors(
                "Cannot have both session key & anonymous_wallet_address".to_string(),
            ));
        }

        // cannot have both empty session key & anonymous_wallet_address
        if temp_user_id.is_none() && input.anonymous_wallet_address.is_none() {
            return Err(CanisterError::ValidationErrors(
                "
                Cannot have both empty session key & anonymous_wallet_address
                "
                .to_string(),
            ));
        }

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
        // if session key not null, temp_user_id = fetch id from (session_key) -- already did above

        // if anonymous_wallet_address not null, temp_user_id = anonymous_wallet_address
        if input.anonymous_wallet_address.is_some() {
            temp_user_id = Some(format!(
                "ANON#{}",
                input.anonymous_wallet_address.clone().unwrap().to_string()
            ));
        }

        // Check "LinkAction" table to check records with
        // link_action link_id = input link_id
        // link_action type = input action type
        // link_action user_id = search_user_id
        let link_action = self.link_service.get_link_action_user(
            input.link_id.clone(),
            input.action_type.clone(),
            temp_user_id.clone().unwrap(),
        )?;

        if link_action.is_none() {
            return Ok(None);
        }

        info!(
            "[link_get_user_state] user_id: {:?}, link_id: {:?}, action_type: {:?}",
            temp_user_id, input.link_id, input.action_type
        );

        // If found "LinkAction" values
        // return action = get action from (action _id)
        // return state = record user_state
        let action_id = link_action.as_ref().unwrap().action_id.clone();
        let link_user_state = link_action
            .as_ref()
            .unwrap()
            .link_user_state
            .clone()
            .ok_or(CanisterError::HandleLogicError(
                "Link user state is not found".to_string(),
            ))?;

        let action = self
            .action_service
            .get_action_data(action_id)
            .map_err(|e| CanisterError::HandleLogicError(format!("Failed to get action: {}", e)))?;

        return Ok(Some(LinkGetUserStateOutput {
            action: ActionDto::from_with_tx(action.action, action.intents, action.intent_txs),
            link_user_state: link_user_state.to_string(),
        }));
    }

    pub fn link_update_user_state(
        &self,
        input: LinkUpdateUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
        let caller = self.ic_env.caller();
        let mut temp_user_id = match caller != Principal::anonymous() {
            true => self.user_service.get_user_id_by_wallet(&caller),
            false => None,
        };

        // Validation
        // cannot have both session key & anonymous_wallet_address
        if temp_user_id.is_some() && input.anonymous_wallet_address.is_some() {
            return Err(CanisterError::ValidationErrors(
                "Cannot have both session key & anonymous_wallet_address".to_string(),
            ));
        }

        // cannot have both empty session key & anonymous_wallet_address
        if temp_user_id.is_none() && input.anonymous_wallet_address.is_none() {
            return Err(CanisterError::ValidationErrors(
                "Cannot have both empty session key & anonymous_wallet_address".to_string(),
            ));
        }

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

        //         Logic
        // if session key not null, temp_user_id = fetch id from (session_key) -- already did in 301

        // if anonymous_wallet_address not null, temp_user_id = anonymous_wallet_address
        if input.anonymous_wallet_address.is_some() {
            temp_user_id = Some(format!(
                "ANON#{}",
                input.anonymous_wallet_address.clone().unwrap().to_string()
            ));
        }

        let goto = UserStateMachineGoto::from_str(&input.goto.clone())
            .map_err(|e| CanisterError::ValidationErrors(format!("Invalid goto: {}", e)))?;

        // Check "LinkAction" table to check records with
        // link_action link_id = input link_id
        // link_action type = input action type
        // link_action user_id = search_user_id
        let link_action = self.link_service.handle_user_link_state_machine(
            input.link_id.clone(),
            input.action_type.clone(),
            temp_user_id.clone().unwrap(),
            goto,
        )?;

        // If not found
        // return action = null
        // return link_user_state = null
        // If found "LinkAction" values
        // return action = get action from (action _id)
        // return state = record user_state
        let link_user_state: Option<cashier_types::LinkUserState> =
            link_action.link_user_state.clone();
        let action = self
            .action_service
            .get_action_data(link_action.action_id.clone())
            .map_err(|e| CanisterError::HandleLogicError(format!("Failed to get action: {}", e)))?;

        return Ok(Some(LinkGetUserStateOutput {
            action: ActionDto::from_with_tx(action.action, action.intents, action.intent_txs),
            link_user_state: link_user_state.unwrap().to_string(),
        }));
    }

    pub async fn update_action(
        &self,
        input: UpdateActionInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = ic_cdk::api::caller();

        let is_creator = self
            .validate_service
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

        let update_action_res = self
            .tx_manager_service
            .update_action(args)
            .await
            .map_err(|e| {
                CanisterError::HandleLogicError(format!("Failed to update action: {}", e))
            });

        update_action_res
    }

    /// Update an existing link
    pub async fn update_link(&self, input: UpdateLinkInput) -> Result<LinkDto, CanisterError> {
        let creator = self.ic_env.caller();

        // Get link
        let link = match self.link_service.get_link_by_id(input.id.clone()) {
            Ok(rsp) => rsp,
            Err(e) => {
                error!("Failed to get link: {:#?}", e);
                return Err(e);
            }
        };

        // Verify creator
        if !self
            .link_service
            .is_link_creator(creator.to_text(), &input.id)
        {
            return Err(CanisterError::Unauthorized(
                "Caller are not the creator of this link".to_string(),
            ));
        }

        // Validate link type
        let link_type = link.link_type.clone();
        if link_type.is_none() {
            return Err(CanisterError::ValidationErrors(
                "Link type is missing".to_string(),
            ));
        }

        let params = input.params.clone();
        let updated_link = self
            .link_service
            .handle_link_state_transition(&input.id, input.action, params)
            .await?;

        Ok(LinkDto::from(updated_link))
    }
}
