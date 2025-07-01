// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_types::{
    action::v1::{Action, ActionState, ActionType},
    link::v1::Link,
    link_action::v1::LinkAction,
};
use std::str::FromStr;

use crate::services::link::traits::LinkStateMachine;
use crate::{core::link::types::UpdateLinkInput, services::link::traits::LinkValidation};
use crate::{
    core::{action::types::ActionDto, link::types::GetLinkOptions},
    error,
    repositories::{
        self, action::ActionRepository, link_action::LinkActionRepository,
        user_wallet::UserWalletRepository,
    },
    services::{
        action::ActionService, ext::icrc_batch::IcrcBatchService, request_lock::RequestLockService,
        transaction_manager::service::TransactionManagerService, user::v2::UserService,
    },
    types::{
        api::{PaginateInput, PaginateResult},
        error::CanisterError,
    },
    utils::{icrc::IcrcService, runtime::IcEnvironment},
};

pub struct LinkService<E: IcEnvironment + Clone> {
    // LinkService fields go here
    pub link_repository: repositories::link::LinkRepository,
    pub link_action_repository: LinkActionRepository,
    pub action_repository: ActionRepository,
    pub action_service: ActionService,
    pub icrc_service: IcrcService,
    pub user_wallet_repository: UserWalletRepository,
    pub user_link_repository: repositories::user_link::UserLinkRepository,
    pub ic_env: E,
    pub request_lock_service: RequestLockService,
    pub user_service: UserService,
    pub icrc_batch_service: IcrcBatchService,
    pub tx_manager_service: TransactionManagerService<E>,
}

impl<E: IcEnvironment + Clone> LinkService<E> {
    pub fn new(
        link_repository: repositories::link::LinkRepository,
        link_action_repository: LinkActionRepository,
        action_repository: ActionRepository,
        action_service: ActionService,
        icrc_service: IcrcService,
        user_wallet_repository: UserWalletRepository,
        user_link_repository: repositories::user_link::UserLinkRepository,
        request_lock_service: RequestLockService,
        user_service: UserService,
        icrc_batch_service: IcrcBatchService,
        tx_manager_service: TransactionManagerService<E>,
        ic_env: E,
    ) -> Self {
        Self {
            link_repository,
            link_action_repository,
            action_repository,
            action_service,
            icrc_service,
            user_wallet_repository,
            user_link_repository,
            ic_env,
            request_lock_service,
            user_service,
            icrc_batch_service,
            tx_manager_service,
        }
    }

    pub fn get_instance() -> Self {
        Self {
            link_repository: repositories::link::LinkRepository::new(),
            link_action_repository: LinkActionRepository::new(),
            action_repository: ActionRepository::new(),
            action_service: ActionService::get_instance(),
            icrc_service: IcrcService::new(),
            user_wallet_repository: UserWalletRepository::new(),
            user_link_repository: repositories::user_link::UserLinkRepository::new(),
            ic_env: E::new(),
            request_lock_service: RequestLockService::get_instance(),
            user_service: UserService::get_instance(),
            icrc_batch_service: IcrcBatchService::get_instance(),
            tx_manager_service: TransactionManagerService::get_instance(),
        }
    }

    pub fn get_link_by_id(&self, id: &str) -> Result<Link, CanisterError> {
        let link = self
            .link_repository
            .get(&id.to_string())
            .ok_or_else(|| CanisterError::NotFound("link not found".to_string()))?;

        Ok(link)
    }

    /// Retrieves a specific link by ID with optional action data based on permissions.
    ///
    /// This method handles complex access control logic:
    /// - Anonymous users can view links but with limited action access
    /// - Authenticated users can access their own actions
    /// - Link creators have full access to all action types
    /// - Non-creators can only access "Use" actions (claims)
    pub fn get_link(
        &self,
        id: &str,
        options: Option<GetLinkOptions>,
        caller: &Principal,
    ) -> Result<(Link, Option<Action>), String> {
        let user_id = self.user_service.get_user_id_by_wallet(&caller);

        // Allow both anonymous callers and non-anonymous callers without user IDs to proceed

        let is_valid_creator = if *caller != Principal::anonymous() {
            self.is_link_creator(&caller.to_text(), id)
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
        let link = match self.get_link_by_id(id) {
            Ok(link) => link,
            Err(e) => return Err(e.to_string()),
        };

        // Get action data (only if user_id exists)
        let action = match (action_type, &user_id) {
            (Some(action_type), Some(user_id)) => {
                self.get_link_action(id, action_type.to_str(), user_id)
            }
            _ => None,
        };

        Ok((link, action))
    }

    pub fn get_action_of_link(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Option<Action> {
        let link_actions = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);

        link_actions
            .first()
            .and_then(|la| self.action_repository.get(&la.action_id))
    }

    pub fn get_link_action_user(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Result<Option<LinkAction>, CanisterError> {
        let link_action = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);
        if link_action.is_empty() {
            return Ok(None);
        }

        Ok(Some(link_action[0].clone()))
    }

    pub fn get_link_action(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Option<Action> {
        let link_actions = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);

        link_actions
            .first()
            .map(|link_action| link_action.action_id.clone())
            .and_then(|action_id| self.action_repository.get(&action_id))
    }

    /// Updates link properties after an action completes
    /// Returns true if link properties were updated, false otherwise
    pub fn update_link_use_counter(
        &self,
        link_id: &str,
        action_id: &str,
    ) -> Result<bool, CanisterError> {
        // Get the link and action
        let link = self.get_link_by_id(link_id)?;
        let action = match self.action_repository.get(action_id) {
            Some(action) => action,
            None => return Ok(false),
        };

        // Early return if not a successful claim on a TipLink
        if action.state != ActionState::Success {
            return Ok(false);
        }

        // At this point we know we have a successful claim on a TipLink
        // Update link's properties here
        let mut updated_link = link;
        let mut is_update: bool = false;

        if action.r#type == ActionType::Use {
            // Update asset info to track the claim
            if updated_link.link_use_action_counter + 1 > updated_link.link_use_action_max_count {
                return Err(CanisterError::HandleLogicError(
                    "Link use action counter exceeded max count".to_string(),
                ));
            }
            updated_link.link_use_action_counter += 1;
            is_update = true;
        }

        // Save the updated link
        if !is_update {
            return Ok(false);
        }

        self.link_repository.update(updated_link);

        // Return true to indicate that we updated the link
        Ok(true)
    }

    /// Get links by principal
    pub fn get_links_by_principal(
        &self,
        principal: &str,
        pagination: &PaginateInput,
    ) -> Result<PaginateResult<Link>, String> {
        let user_wallet = self
            .user_wallet_repository
            .get(principal)
            .ok_or_else(|| "User not found".to_string())?;

        let user_id = user_wallet.user_id;

        let links = match self.get_links_by_user_id(&user_id, pagination) {
            Ok(link_users) => link_users,
            Err(e) => return Err(e),
        };

        Ok(links)
    }

    /// Get links by user ID
    pub fn get_links_by_user_id(
        &self,
        user_id: &str,
        pagination: &PaginateInput,
    ) -> Result<PaginateResult<Link>, String> {
        let user_links = self
            .user_link_repository
            .get_links_by_user_id(user_id, pagination);

        let link_ids = user_links
            .data
            .iter()
            .map(|link_user| link_user.link_id.clone())
            .collect();

        let links = self.link_repository.get_batch(link_ids);

        let res = PaginateResult::new(links, user_links.metadata);
        Ok(res)
    }

    pub fn link_handle_tx_update(
        &self,
        previous_state: &ActionState,
        current_state: &ActionState,
        link_id: &str,
        action_type: &ActionType,
        action_id: &str,
    ) -> Result<(), CanisterError> {
        // Return early if state hasn't changed
        if previous_state == current_state {
            return Ok(());
        }

        // Return early if this isn't a claim/use action or if it's not a successful state
        if (action_type != &ActionType::Use) || current_state != &ActionState::Success {
            return Ok(());
        }

        // At this point we know:
        // 1. The state has changed
        // 2. The action type is either Claim or Use
        // 3. The current state is Success

        // Update link properties
        let result = self.update_link_use_counter(link_id, action_id);
        if let Err(err) = result {
            error!(
                "[link_handle_tx_update] Failed to update link properties for link_id: {:?}, action_id: {:?}, error: {:?}",
                link_id, action_id, err
            );

            return Err(CanisterError::HandleLogicError(format!(
                "Failed to update link properties: {}",
                err
            )));
        }

        Ok(())
    }

    pub async fn update_link(
        &self,
        caller: &Principal,
        input: &UpdateLinkInput,
    ) -> Result<Link, CanisterError> {
        let link = self.get_link_by_id(&input.id)?;

        // Get link
        let link = match self.get_link_by_id(&input.id) {
            Ok(rsp) => rsp,
            Err(e) => {
                error!("Failed to get link: {:#?}", e);
                return Err(e);
            }
        };

        // Verify creator
        if !self.is_link_creator(&caller.to_text(), &input.id) {
            return Err(CanisterError::Unauthorized(
                "Caller are not the creator of this link".to_string(),
            ));
        }

        // Validate link type
        let link_type = link.link_type;
        if link_type.is_none() {
            return Err(CanisterError::ValidationErrors(
                "Link type is missing".to_string(),
            ));
        }

        let params = input.params.clone();
        let updated_link = self
            .handle_link_state_transition(&input.id, &input.action, params)
            .await?;

        Ok(updated_link)
    }
}
