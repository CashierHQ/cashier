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
    link_v3::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{action::v1::ActionType, link_action::v1::LinkAction, user_link::v1::UserLink},
};
use cashier_shared::types::Action as ActionShared;
use std::rc::Rc;
use transaction_manager::v3::traits::TransactionManagerV3;

pub struct LinkV3Service<R: Repositories, M: TransactionManagerV3 + 'static> {
    pub link_repository: repositories::link::LinkRepository<R::Link>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub transaction_manager: Rc<M>,
}

impl<R: Repositories, M: TransactionManagerV3 + 'static> LinkV3Service<R, M> {
    pub fn new(repo: &R, transaction_manager: Rc<M>) -> Self {
        Self {
            link_repository: repo.link(),
            user_link_repository: repo.user_link(),
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
        let action_result = self
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
            action: action_result.create_action_result.action,
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
    ) -> Result<LinkCreateActionResult, CanisterError> {
        let link_model = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let factory = LinkFactory::new(self.transaction_manager.clone());
        let link = factory.create_from_link(link_model, canister_id)?;
        let result = link.create_action(caller, action).await?;

        Ok(result)
    }

    pub async fn process_action(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        link_id: &str,
        action_id: &str,
    ) -> Result<LinkProcessActionResult, CanisterError> {
        let action_data = self
            .action_service
            .get_action_data(action_id)
            .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

        let link_model = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let factory = LinkFactory::new(self.transaction_manager.clone());
        let link = factory.create_from_link(link_model, canister_id)?;
        let result = link
            .process_action(caller, action_data.action, action_data.intent_txs)
            .await?;

        // save data to DB
        self.link_repository.update(result.link.clone());
        self.action_service.update_action_data(
            result.process_action_result.action.clone(),
            result.process_action_result.intents.clone(),
            &result.process_action_result.intent_txs_map,
        )?;
        self.action_service.update_link_user_state(&result);

        // response dto
        let action_dto = ActionDto::build(
            &ActionData {
                action: result.process_action_result.action.clone(),
                intents: result.process_action_result.intents.clone(),
                intent_txs: result.process_action_result.intent_txs_map,
            },
            result.process_action_result.icrc112_requests,
        );
        let link_dto = LinkDto::from(result.link);

        Ok(result)
    }
}
