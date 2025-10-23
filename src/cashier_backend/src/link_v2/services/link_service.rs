// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::Repositories;
use crate::services::action::ActionService;
use crate::{link_v2::links::factory, repositories};
use candid::Principal;
use cashier_backend_types::dto::action::IntentDto;
use cashier_backend_types::link_v2::dto::LinkActionDto;
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::{
    dto::{
        action::ActionDto,
        link::{CreateLinkInput, GetLinkResp, LinkDto},
    },
    error::CanisterError,
    repository::{action::v1::ActionType, link_action::v1::LinkAction, user_link::v1::UserLink},
    service::action::ActionData,
};

pub struct LinkV2Service<R: Repositories> {
    pub link_repository: repositories::link::LinkRepository<R::Link>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub action_service: ActionService<R>,
}

#[allow(clippy::too_many_arguments)]
impl<R: Repositories> LinkV2Service<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            link_repository: repo.link(),
            user_link_repository: repo.user_link(),
            action_service: ActionService::new(repo),
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
    ) -> Result<LinkActionDto, CanisterError> {
        let link_model = factory::create_link(creator_id, input, created_at_ts, canister_id)?;

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

        Ok(LinkActionDto {
            link: link_dto,
            action: action_dto,
        })
    }

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

        link.state = LinkState::Inactive;
        // update link in db
        self.link_repository.update(link.clone());

        Ok(LinkDto::from(link))
    }

    pub async fn create_action(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        link_id: &str,
        action_type: ActionType,
    ) -> Result<ActionDto, CanisterError> {
        let link = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let link = factory::from_link(link, canister_id)?;
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

    pub async fn process_action(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        action_id: &str,
    ) -> Result<LinkActionDto, CanisterError> {
        let action = self
            .action_service
            .get_action_by_id(action_id)
            .ok_or_else(|| CanisterError::NotFound("Action not found".to_string()))?;

        let link = self
            .link_repository
            .get(&action.link_id)
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let link = factory::from_link(link, canister_id)?;
        let result = link.process_action(caller, action).await?;

        let action_dto = ActionDto::build(
            &ActionData {
                action: result.process_action_result.action.clone(),
                intents: result.process_action_result.intents.clone(),
                intent_txs: result.process_action_result.intent_txs_map,
            },
            None,
        );

        let link_dto = LinkDto::from(result.link);

        Ok(LinkActionDto {
            link: link_dto,
            action: action_dto,
        })
    }
}
