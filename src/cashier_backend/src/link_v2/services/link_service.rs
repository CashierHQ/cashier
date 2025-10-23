// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::rc::Rc;

use crate::link_v2::links::factory::LinkFactory;
use crate::link_v2::transaction_manager::traits::TransactionManager;
use crate::repositories;
use crate::repositories::Repositories;
use crate::services::action::ActionService;
use candid::Principal;
use cashier_backend_types::link_v2::dto::{CreateLinkDto, ProcessActionDto};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::{
    dto::{
        action::ActionDto,
        link::{CreateLinkInput, LinkDto},
    },
    error::CanisterError,
    repository::{action::v1::ActionType, link_action::v1::LinkAction, user_link::v1::UserLink},
    service::action::ActionData,
};

pub struct LinkV2Service<R: Repositories, M: TransactionManager + 'static> {
    pub link_repository: repositories::link::LinkRepository<R::Link>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub action_service: ActionService<R>,
    pub transaction_manager: Rc<M>,
}

#[allow(clippy::too_many_arguments)]
impl<R: Repositories, M: TransactionManager + 'static> LinkV2Service<R, M> {
    pub fn new(repo: &R, transaction_manager: Rc<M>) -> Self {
        Self {
            link_repository: repo.link(),
            user_link_repository: repo.user_link(),
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
        input: CreateLinkInput,
        created_at_ts: u64,
    ) -> Result<CreateLinkDto, CanisterError> {
        let factory = LinkFactory::new(self.transaction_manager.clone());
        let link_model = factory.create_link(creator_id, input, created_at_ts, canister_id)?;

        // save link & user_link to db
        self.link_repository.create(link_model.clone());

        let new_user_link = UserLink {
            user_id: creator_id,
            link_id: link_model.id.clone(),
        };
        self.user_link_repository.create(new_user_link);

        let action_dto = self
            .create_action(
                creator_id,
                canister_id,
                &link_model.id,
                ActionType::CreateLink,
            )
            .await?;

        let link_dto = LinkDto::from(link_model);

        Ok(CreateLinkDto {
            link: link_dto,
            action: action_dto,
        })
    }

    /// Disables an existing link V2
    /// # Arguments
    /// * `caller` - The principal of the user disabling the link
    /// * `link_id` - The ID of the link to disable
    /// # Returns
    /// * `Ok(LinkDto)` - The disabled link data
    /// * `Err(CanisterError)` - If disabling fails or unauthorized
    pub async fn disable_link(
        &mut self,
        caller: Principal,
        link_id: &str,
    ) -> Result<LinkDto, CanisterError> {
        let mut link = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        if link.creator != caller {
            return Err(CanisterError::Unauthorized(
                "Only the creator can disable the link".to_string(),
            ));
        }

        if link.state != LinkState::Active {
            return Err(CanisterError::ValidationErrors(
                "Only active links can be disabled".to_string(),
            ));
        }

        link.state = LinkState::Inactive;
        // update link in db
        self.link_repository.update(link.clone());

        Ok(LinkDto::from(link))
    }

    /// Creates a new action V2.
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `canister_id` - The canister ID of the token contract
    /// * `link_id` - The ID of the link for which the action is created
    /// * `action_type` - The type of action to be created
    /// # Returns
    /// * `Ok(ActionDto)` - The created action data
    /// * `Err(CanisterError)` - If action creation fails or validation errors occur
    pub async fn create_action(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        link_id: &str,
        action_type: ActionType,
    ) -> Result<ActionDto, CanisterError> {
        let link_model = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let factory = LinkFactory::new(self.transaction_manager.clone());
        let link = factory.create_from_link(link_model, canister_id)?;
        let result = link.create_action(caller, action_type).await?;

        // save action to DB
        let link_action = LinkAction {
            link_id: link_id.to_string(),
            action_type: result.create_action_result.action.r#type.clone(),
            action_id: result.create_action_result.action.id.clone(),
            user_id: result.create_action_result.action.creator,
            link_user_state: None,
        };

        let _ = self.action_service.store_action_data(
            link_action,
            result.create_action_result.action.clone(),
            result.create_action_result.intents.clone(),
            result.create_action_result.intent_txs_map.clone(),
            result.create_action_result.action.creator,
        );

        let action_dto: ActionDto = result.create_action_result.into();

        Ok(action_dto)
    }

    /// Processes a created action V2.
    /// # Arguments
    /// * `caller` - The principal of the user processing the action
    /// * `canister_id` - The canister ID of the token contract
    /// * `action_id` - The ID of the action to be processed
    /// # Returns
    /// * `Ok(ProcessActionDto)` - The processed action data
    /// * `Err(CanisterError)` - If action processing fails or validation errors occur
    pub async fn process_action(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        action_id: &str,
    ) -> Result<ProcessActionDto, CanisterError> {
        let action_data = self
            .action_service
            .get_action_data(action_id)
            .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

        let link_model = self
            .link_repository
            .get(&action_data.action.link_id)
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let factory = LinkFactory::new(self.transaction_manager.clone());
        let link = factory.create_from_link(link_model, canister_id)?;
        let result = link
            .process_action(
                caller,
                action_data.action,
                action_data.intents,
                action_data.intent_txs,
            )
            .await?;

        // save data to DB
        self.link_repository.update(result.link.clone());
        self.action_service.update_action_data(
            result.process_action_result.action.clone(),
            result.process_action_result.intents.clone(),
        )?;

        // response dto
        let action_dto = ActionDto::build(
            &ActionData {
                action: result.process_action_result.action.clone(),
                intents: result.process_action_result.intents.clone(),
                intent_txs: result.process_action_result.intent_txs_map,
            },
            None,
        );
        let link_dto = LinkDto::from(result.link);

        Ok(ProcessActionDto {
            link: link_dto,
            action: action_dto,
        })
    }
}
