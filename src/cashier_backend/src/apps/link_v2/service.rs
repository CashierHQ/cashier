// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::dto::link::{GetLinkOptions, GetLinkResp, LinkUserStateDto};
use cashier_backend_types::link_v2::dto::{CreateLinkDto, ProcessActionDto};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::service::link::{PaginateInput, PaginateResult};
use cashier_backend_types::{
    dto::{
        action::ActionDto,
        link::{CreateLinkInput, LinkDto},
    },
    error::CanisterError,
    repository::{action::v1::ActionType, link_action::v1::LinkAction, user_link::v1::UserLink},
    service::action::v1::ActionData,
};
use transaction_manager::v2::traits::TransactionManager;

use crate::{
    apps::{
        action::ActionService, link_v2::links::factory::LinkFactory,
        token_balance::traits::TokenBalanceFetcher, token_fee::traits::TokenFeeCache,
        token_standard::traits::TokenStandardCache,
    },
    repositories::{self, Repositories},
};

pub struct LinkV2Service<R: Repositories> {
    pub link_repository: repositories::link::LinkRepository<R::Link>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub user_link_action_repository:
        repositories::user_link_action::UserLinkActionRepository<R::UserLinkAction>,
    pub action_service: ActionService<R>,
}

impl<R: Repositories> LinkV2Service<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            link_repository: repo.link(),
            user_link_repository: repo.user_link(),
            user_link_action_repository: repo.user_link_action(),
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
    #[allow(clippy::too_many_arguments)]
    pub async fn create_link<M, F, S, B>(
        &mut self,
        creator_id: Principal,
        canister_id: Principal,
        input: CreateLinkInput,
        created_at_ts: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<CreateLinkDto, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let link_model = LinkFactory::create_link(creator_id, input, created_at_ts, canister_id)?;

        // save link & user_link to db
        self.link_repository.create(link_model.clone());

        let new_user_link = UserLink {
            user_id: creator_id,
            link_id: link_model.id.clone(),
        };
        self.user_link_repository.create(new_user_link);

        // create action firstly
        let action_dto = self
            .create_action(
                creator_id,
                canister_id,
                &link_model.id,
                ActionType::CreateLink,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await?;

        let link_dto = LinkDto::from(link_model);

        Ok(CreateLinkDto {
            link: link_dto,
            action: action_dto,
        })
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
    #[allow(clippy::too_many_arguments)]
    pub async fn create_action<M, F, S, B>(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        link_id: &str,
        action_type: ActionType,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<ActionDto, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        // Check if action already exists for this user, link, and action type
        self.action_service
            .check_action_exists_for_user(caller, link_id, &action_type)?;

        let link_model = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let link = LinkFactory::create_from_link_model(link_model, canister_id)?;
        let result = link
            .create_action(
                caller,
                action_type,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await?;

        // save data to DB
        let link_action = LinkAction {
            link_id: link_id.to_string(),
            action_type: result.create_action_result.action.r#type.clone(),
            action_id: result.create_action_result.action.id.clone(),
            user_id: result.create_action_result.action.creator,
            link_user_state: None,
        };

        self.action_service.store_action_data(
            link_action.clone(),
            result.create_action_result.action.clone(),
            result.create_action_result.intents.clone(),
            result.create_action_result.intent_txs_map.clone(),
            result.create_action_result.action.creator,
        )?;

        self.user_link_action_repository.create(link_action);

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
    pub async fn process_action<M>(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        action_id: &str,
        transaction_manager: M,
    ) -> Result<ProcessActionDto, CanisterError>
    where
        M: TransactionManager + 'static,
    {
        let action_data = self
            .action_service
            .get_action_data(action_id)
            .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

        let link_model = self
            .link_repository
            .get(&action_data.action.link_id)
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let link = LinkFactory::create_from_link_model(link_model, canister_id)?;
        let result = link
            .process_action(
                caller,
                action_data.action,
                action_data.intents,
                action_data.intent_txs,
                transaction_manager,
            )
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

        Ok(ProcessActionDto {
            link: link_dto,
            action: action_dto,
            is_success: result.process_action_result.is_success,
            errors: result.process_action_result.errors,
        })
    }

    /// Retrieves a paginated list of links of caller.
    /// # Arguments
    /// * `caller` - The principal of the user retrieving the links
    /// * `input` - Pagination options
    /// # Returns
    /// * `Ok(PaginateResult<LinkDto>)` - The paginated list of links
    /// * `Err(CanisterError)` - If retrieval fails
    pub async fn get_links(
        &self,
        caller: Principal,
        input: Option<PaginateInput>,
    ) -> Result<PaginateResult<LinkDto>, CanisterError> {
        let user_links = self
            .user_link_repository
            .get_links_by_user_id(&caller, &input.unwrap_or_default());

        let link_ids = user_links
            .data
            .iter()
            .map(|link_user| link_user.link_id.clone())
            .collect();

        let links = self.link_repository.get_batch(link_ids);

        let paginate_result = PaginateResult::new(links, user_links.metadata);
        Ok(paginate_result.map(LinkDto::from))
    }

    /// Retrieves the details of a specific link along with an optional action.
    /// # Arguments
    /// * `caller` - The principal of the user retrieving the link details
    /// * `link_id` - The ID of the link to retrieve
    /// * `options` - Optional parameters to include action data
    /// # Returns
    /// * `Ok(GetLinkResp)` - The link details along with optional action data
    /// * `Err(CanisterError)` - If retrieval fails or link not found
    pub async fn get_link_details<M>(
        &self,
        caller: Principal,
        link_id: &str,
        options: Option<GetLinkOptions>,
        transaction_manager: M,
    ) -> Result<GetLinkResp, CanisterError>
    where
        M: TransactionManager + 'static,
    {
        let link_model = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        // pick first Action and link_user_state
        let (action, link_user_state) = self
            .action_service
            .get_first_action(&caller, link_id, options);

        // build response dto
        let link_dto = LinkDto::from(link_model);

        let action_dto: Option<ActionDto> = if let Some(action) = action {
            let action_data = self
                .action_service
                .get_action_data(&action.id)
                .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

            let create_action_result = transaction_manager.create_action(
                action,
                action_data.intents,
                Some(action_data.intent_txs),
            )?;

            Some(create_action_result.into())
        } else {
            None
        };

        let link_user_state_dto = LinkUserStateDto::from_parts(&caller, link_id, link_user_state);

        Ok(GetLinkResp {
            link: link_dto,
            action: action_dto,
            link_user_state: link_user_state_dto,
        })
    }

    /// Disables an existing link V2
    /// # Arguments
    /// * `caller` - The principal of the user disabling the link
    /// * `link_id` - The ID of the link to disable
    /// # Returns
    /// * `Ok(LinkDto)` - The disabled link data
    /// * `Err(CanisterError)` - If disabling fails or unauthorized
    pub fn disable_link(
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
}
