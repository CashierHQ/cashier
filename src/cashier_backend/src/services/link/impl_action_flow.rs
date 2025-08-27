use std::str::FromStr;

use candid::Principal;
use uuid::Uuid;

use crate::utils::runtime::IcEnvironment;
use crate::{
    repositories::Repositories,
    services::{
        link::{
            service::LinkService,
            traits::{ActionFlow, IntentAssembler, LinkValidation},
        },
        transaction_manager::traits::{ActionCreator, ActionUpdater, TransactionValidator},
    },
};
use cashier_backend_types::{
    dto::action::{
        ActionDto, CreateActionAnonymousInput, CreateActionInput, ProcessActionAnonymousInput,
        ProcessActionInput, UpdateActionInput,
    },
    error::CanisterError,
    repository::{
        action::v1::{ActionState, ActionType},
        link_action::v1::LinkUserState,
    },
    service::{link::TemporaryAction, tx_manager::UpdateActionArgs},
};

impl<E: 'static + IcEnvironment + Clone, R: 'static + Repositories> ActionFlow
    for LinkService<E, R>
{
    async fn create_action(
        &mut self,
        ts: u64,
        input: &CreateActionInput,
        caller: Principal,
    ) -> Result<ActionDto, CanisterError> {
        // input validate

        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors("Invalid action type ".to_string()))?;

        // Create lock for action creation
        let request_lock_key = self
            .request_lock_service
            .create_request_lock_for_creating_action(&input.link_id, caller, self.ic_env.time())?;

        // Execute main logic and capture result
        let result = async {
            let action = self.get_action_of_link(&input.link_id, &input.action_type, caller);

            if action.is_some() {
                return Err(CanisterError::ValidationErrors(
                    "Action already exist!".to_string(),
                ));
            }

            self.link_validate_user_create_action(&input.link_id, &action_type, caller)?;

            // Validate user can create action
            self.link_validate_user_create_action(&input.link_id, &action_type, caller)?;

            // Create temp action with default state
            let default_link_user_state = match action_type {
                ActionType::Use => Some(LinkUserState::ChooseWallet),
                _ => None,
            };

            let assets = self.get_assets_for_action(&input.link_id, &action_type)?;

            let fee_map = self
                .icrc_batch_service
                .get_batch_tokens_fee(&assets)
                .await?;

            //create temp action
            // fill in link_id info
            // fill in action_type info
            // fill in default_link_user_state info
            let mut temp_action = TemporaryAction {
                id: Uuid::new_v4().to_string(),
                r#type: action_type.clone(),
                state: ActionState::Created,
                creator: caller,
                link_id: input.link_id.clone(),
                intents: vec![],
                default_link_user_state,
            };

            // Assemble intents
            let intents = self
                .assemble_intents(&temp_action.link_id, &temp_action.r#type, caller, &fee_map)
                .await?;

            temp_action.intents = intents;

            // Create real action
            self.tx_manager_service.create_action(ts, &mut temp_action)
        }
        .await;

        // Drop lock regardless of success or failure
        let _ = self.request_lock_service.drop(&request_lock_key);

        result
    }

    async fn process_action(
        &mut self,
        input: &ProcessActionInput,
        caller: Principal,
    ) -> Result<ActionDto, CanisterError> {
        // input validate
        let user_id = self.user_service.get_user_id_by_wallet(&caller);

        let _ = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors("Invalid action type ".to_string()))?;

        // basic validations
        if user_id.is_none() {
            return Err(CanisterError::ValidationErrors(
                "User not found".to_string(),
            ));
        }

        // Create lock for action processing
        let request_lock_key = self
            .request_lock_service
            .create_request_lock_for_processing_action(
                &caller,
                &input.link_id,
                &input.action_id,
                self.ic_env.time(),
            )?;

        // Execute main logic and capture result
        let result = async {
            let user_id_ref = user_id
                .as_ref()
                .ok_or_else(|| CanisterError::ValidationErrors("User not found".to_string()))?;

            let action = self.get_action_of_link(&input.link_id, &input.action_type, user_id_ref);

            let action_ref = action.as_ref().ok_or_else(|| {
                CanisterError::ValidationErrors("Action is not existed".to_string())
            })?;

            self.link_validate_user_update_action(action_ref, user_id_ref)?;
            let action_id = action_ref.id.clone();

            // execute action
            let update_action_res = self
                .tx_manager_service
                .update_action(
                    caller,
                    UpdateActionArgs {
                        action_id,
                        link_id: input.link_id.to_string(),
                        execute_wallet_tx: false,
                    },
                )
                .await?;

            Ok(update_action_res)
        }
        .await;

        // Drop lock regardless of success or failure
        let _ = self.request_lock_service.drop(&request_lock_key);

        result
    }

    async fn update_action(
        &mut self,
        input: &UpdateActionInput,
        caller: Principal,
    ) -> Result<ActionDto, CanisterError> {
        let is_creator = self
            .tx_manager_service
            .is_action_creator(&caller, &input.action_id)
            .map_err(|e| {
                CanisterError::ValidationErrors(format!("Failed to validate action: {e}"))
            })?;

        if !is_creator {
            return Err(CanisterError::ValidationErrors(
                "User is not the creator of the action".to_string(),
            ));
        }

        // Create lock for action update
        let request_lock_key = self
            .request_lock_service
            .create_request_lock_for_updating_action(
                &caller,
                &input.link_id,
                &input.action_id,
                self.ic_env.time(),
            )?;

        // Execute main logic and capture result
        let result = async {
            let args = UpdateActionArgs {
                action_id: input.action_id.clone(),
                link_id: input.link_id.clone(),
                execute_wallet_tx: true,
            };

            self.tx_manager_service
                .update_action(caller, args)
                .await
                .map_err(|e| {
                    CanisterError::HandleLogicError(format!("Failed to update action: {e}"))
                })
        }
        .await;

        // Drop lock regardless of success or failure
        let _ = self.request_lock_service.drop(&request_lock_key);

        result
    }

    async fn create_action_anonymous(
        &mut self,
        ts: u64,
        input: &CreateActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError> {
        // check wallet address
        let wallet_principal = match Principal::from_text(input.wallet_address.clone()) {
            Ok(wa) => wa,
            Err(_) => {
                return Err(CanisterError::ValidationErrors(
                    "Invalid wallet address".to_string(),
                ));
            }
        };

        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors("Invalid action type".to_string()))?;

        // check action type is claim
        if action_type != ActionType::Use {
            return Err(CanisterError::ValidationErrors(
                "Invalid action type, only Claim or Use action type is allowed".to_string(),
            ));
        }

        // add prefix for easy query
        let user_id = format!("ANON#{}", input.wallet_address);

        // Create lock for action creation using wallet principal for anonymous users
        let request_lock_key = self
            .request_lock_service
            .create_request_lock_for_creating_action(
                &input.link_id,
                &wallet_principal,
                self.ic_env.time(),
            )?;

        // Execute main logic and capture result
        let result = async {
            let action = self.get_action_of_link(&input.link_id, &input.action_type, &user_id);

            if action.is_some() {
                return Err(CanisterError::ValidationErrors(
                    "Action already exist!".to_string(),
                ));
            }

            self.link_validate_user_create_action(&input.link_id, &action_type, &user_id)?;

            let action = self.get_action_of_link(&input.link_id, &input.action_type, &user_id);

            if action.is_some() {
                return Err(CanisterError::ValidationErrors(
                    "Action already exist!".to_string(),
                ));
            }

            self.link_validate_user_create_action(&input.link_id, &action_type, &user_id)?;

            // Validate user can create action
            self.link_validate_user_create_action(&input.link_id, &action_type, &user_id)?;

            // Create temp action with default state
            let default_link_user_state = match action_type {
                ActionType::Use => Some(LinkUserState::ChooseWallet),
                _ => None,
            };

            //create temp action
            // fill in link_id info
            // fill in action_type info
            // fill in default_link_user_state info
            let mut temp_action = TemporaryAction {
                id: Uuid::new_v4().to_string(),
                r#type: action_type.clone(),
                state: ActionState::Created,
                creator: user_id.clone(),
                link_id: input.link_id.clone(),
                intents: vec![],
                default_link_user_state,
            };

            let assets = self.get_assets_for_action(&temp_action.link_id, &temp_action.r#type)?;

            let fee_map = self
                .icrc_batch_service
                .get_batch_tokens_fee(&assets)
                .await?;

            // Assemble intents
            let intents = self
                .assemble_intents(
                    &temp_action.link_id,
                    &temp_action.r#type,
                    &wallet_principal,
                    &fee_map,
                )
                .await?;

            temp_action.intents = intents;

            // Create real action
            self.tx_manager_service.create_action(ts, &mut temp_action)
        }
        .await;

        // Drop lock regardless of success or failure
        let _ = self.request_lock_service.drop(&request_lock_key);

        result
    }

    async fn process_action_anonymous(
        &mut self,
        caller: Principal,
        input: &ProcessActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError> {
        // check wallet address
        let _ = match Principal::from_text(input.wallet_address.clone()) {
            Ok(wa) => wa,
            Err(_) => {
                return Err(CanisterError::ValidationErrors(
                    "Invalid wallet address".to_string(),
                ));
            }
        };

        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors("Invalid action type ".to_string()))?;

        // check action type is claim
        if action_type != ActionType::Use {
            return Err(CanisterError::ValidationErrors(
                "Invalid action type, only Claim or Use action type is allowed".to_string(),
            ));
        }

        // add prefix for easy query
        let user_id = format!("ANON#{}", input.wallet_address);

        let action = self.get_action_of_link(&input.link_id, &input.action_type, &user_id);

        let action = action
            .ok_or_else(|| CanisterError::ValidationErrors("Action does not exist".to_string()))?;

        // validate action
        self.link_validate_user_update_action(&action, &user_id)?;

        let action_id = action.id.clone();

        // execute action with our standalone callback
        let update_action_res = self
            .tx_manager_service
            .update_action(
                caller,
                UpdateActionArgs {
                    action_id: action_id.clone(),
                    link_id: input.link_id.clone(),
                    execute_wallet_tx: false,
                },
            )
            .await?;

        Ok(update_action_res)
    }
}
