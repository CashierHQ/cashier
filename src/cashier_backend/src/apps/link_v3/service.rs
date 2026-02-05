// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::action::ActionService;
use crate::apps::link_v3::factory::LinkFactory;
use crate::repositories;
use crate::repositories::Repositories;
use candid::Principal;
use cashier_backend_types::{
    dto::{action::ActionDto, link::LinkDto},
    error::CanisterError,
    link_v3::api_args::{CreateLinkV3Input, CreateLinkV3Result},
    repository::{action::v1::ActionType, link_action::v1::LinkAction, user_link::v1::UserLink},
};
use cashier_shared::types::Action as ActionShared;
use std::rc::Rc;
use transaction_manager::traits::{TransactionManager, TransactionManagerV3};

pub struct LinkV3Service<R: Repositories, M: TransactionManagerV3 + 'static> {
    pub link_repository: repositories::link::LinkRepository<R::Link>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub user_link_action_repository:
        repositories::user_link_action::UserLinkActionRepository<R::UserLinkAction>,
    pub action_service: ActionService<R>,
    pub transaction_manager: Rc<M>,
}

impl<R: Repositories, M: TransactionManagerV3 + 'static> LinkV3Service<R, M> {
    pub fn new(repo: &R, transaction_manager: Rc<M>) -> Self {
        Self {
            link_repository: repo.link(),
            user_link_repository: repo.user_link(),
            user_link_action_repository: repo.user_link_action(),
            action_service: ActionService::new(repo),
            transaction_manager,
        }
    }

    /// Create a new link and the corresponding createAction
    ///
    /// # Arguments
    /// * `creator` - The principal of the user creating the link
    /// * `input` - The input data for creating the link
    /// * `created_at_ts` - The timestamp when the link is created
    /// # Returns
    /// * `GetLinkResp` - The response containing the created link and action details
    /// # Errors
    /// * `CanisterError` - If there is an error during link creation or action creation
    pub async fn create_link(
        &mut self,
        creator_id: Principal,
        canister_id: Principal,
        input: CreateLinkV3Input,
        created_at_ts: u64,
    ) -> Result<CreateLinkV3Result, CanisterError> {
        let factory = LinkFactory::new(self.transaction_manager.clone());
        let link_model =
            factory.create_link_v3(creator_id, input.clone(), created_at_ts, canister_id)?;

        // save link & user_link to db
        self.link_repository.create(link_model.clone());

        let new_user_link = UserLink {
            user_id: creator_id,
            link_id: link_model.id.clone(),
        };
        self.user_link_repository.create(new_user_link);

        // create action firstly
        let action = self
            .create_action(
                creator_id,
                canister_id,
                &link_model.id,
                input.action.clone(),
            )
            .await?;

        let link_dto = LinkDto::from(link_model);

        Ok(CreateLinkV3Result {
            link: link_dto,
            action,
        })
    }

    /// Creates a new action V3.
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `canister_id` - The canister ID of the token contract
    /// * `link_id` - The ID of the link for which the action is created
    /// * `action_type` - The type of action to be created
    /// # Returns
    /// * `Ok(ActionShared)` - The created action data
    /// * `Err(CanisterError)` - If action creation fails or validation errors occur
    pub async fn create_action(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        link_id: &str,
        action: ActionShared,
    ) -> Result<ActionShared, CanisterError> {
        let link_model = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let factory = LinkFactory::new(self.transaction_manager.clone());
        let link = factory.create_from_link(link_model, canister_id)?;
        let result = link.create_action(caller, action).await?;

        Ok(result.create_action_result.action)
    }
}
