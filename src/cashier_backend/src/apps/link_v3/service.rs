// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::link_v3::dto::link::GetLinkResponseV3;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::{
        action::{CreateActionResponseV3, ProcessActionResponseV3},
        link::{
            CreateLinkInputV3, CreateLinkResponseV3, DisableLinkResponseV3, GetLinksResponseV3,
        },
    },
    repository::{
        asset_info::v3::AssetInfoV3,
        intent::v3::IntentV3,
        link::{v1::LinkType, v3::LinkState},
        link_action::v1::LinkAction,
        user_link::v1::UserLink,
    },
    service::link::{PaginateInput, PaginateResult},
};
use cashier_shared::{AddressType as AddressTypeShared, types::Action as ActionShared};
use transaction_manager::v3::traits::TransactionManagerV3;

use crate::{
    apps::{
        action::v3::ActionServiceV3, link_v3::factory::LinkFactoryV3,
        token_balance::traits::TokenBalanceFetcher, token_fee::traits::TokenFeeCache,
        token_standard::traits::TokenStandardCache,
    },
    repositories::{self, Repositories},
};

pub struct LinkV3Service<R: Repositories> {
    pub link_v3_repository: repositories::link::v3::LinkV3Repository<R::LinkV3>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub user_link_action_repository:
        repositories::user_link_action::UserLinkActionRepository<R::UserLinkAction>,
    pub action_service: ActionServiceV3<R>,
}

impl<R: Repositories> LinkV3Service<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            link_v3_repository: repo.link_v3(),
            user_link_repository: repo.user_link(),
            user_link_action_repository: repo.user_link_action(),
            action_service: ActionServiceV3::new(repo),
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
    pub async fn create_link<M, F, S, B>(
        &mut self,
        input: CreateLinkInputV3,
        creator_id: Principal,
        canister_id: Principal,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<CreateLinkResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        if input.action.action_type != cashier_shared::types::ActionType::CreateLink {
            return Err(CanisterError::InvalidInput(
                "Only CREATE action can be created when creating a link".to_string(),
            ));
        }

        let link_type: LinkType = input.link_type.into();
        let asset_info: Vec<AssetInfoV3> = input
            .action
            .intents
            .iter()
            .filter(|i| i.dest_address_type != AddressTypeShared::Treasury)
            .map(|i| AssetInfoV3::from(IntentV3::from(i.clone())))
            .collect();

        let link_model = LinkFactoryV3::create_link(
            link_type,
            input.title,
            asset_info,
            input.max_use,
            creator_id,
            created_at,
            canister_id,
        )?;

        // save link & user_link to db
        self.link_v3_repository.create(link_model.clone());

        let new_user_link = UserLink {
            user_id: creator_id,
            link_id: link_model.id.clone(),
        };
        self.user_link_repository.create(new_user_link);

        // create action firstly
        let action_result = self
            .create_action(
                link_model.id.as_str(),
                input.action.clone(),
                creator_id,
                canister_id,
                created_at,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await?;

        Ok(CreateLinkResponseV3 {
            link: action_result.link,
            action: action_result.action,
            icrc112_requests: action_result.icrc112_requests,
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
    pub async fn create_action<M, F, S, B>(
        &mut self,
        link_id: &str,
        action: ActionShared,
        creator: Principal,
        canister_id: Principal,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<CreateActionResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let link_model = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let action_model = self.action_service.create_action_from_shared_data(
            action.clone(),
            Some(link_id.to_string()),
            creator,
        );

        let _intent_models: Vec<IntentV3> = action
            .intents
            .iter()
            .map(|i| IntentV3::from(i.clone()))
            .collect();

        let link_instance = LinkFactoryV3::create_from_link_model(link_model, canister_id)?;
        let result = link_instance
            .create_action(
                creator,
                action_model.action_type,
                created_at,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await?;

        // save data to DB
        let link_action = LinkAction {
            link_id: link_id.to_string(),
            action_type: result.create_action_result.action.action_type.clone(),
            action_id: result.create_action_result.action.id.clone(),
            user_id: result.create_action_result.action.creator,
            link_user_state: None,
        };

        self.action_service.store_action_data(
            link_action,
            result.create_action_result.action.clone(),
            result.create_action_result.intents.clone(),
            result.create_action_result.intent_txs_map.clone(),
            result.create_action_result.action.creator,
        )?;

        // format response
        let link_shared = result.link.to_shared();
        let action_shared = result
            .create_action_result
            .action
            .to_shared(result.create_action_result.intents);

        Ok(CreateActionResponseV3 {
            link: link_shared,
            action: action_shared,
            icrc112_requests: result.create_action_result.icrc112_requests,
        })
    }

    pub async fn process_action<M>(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        action_id: &str,
        transaction_manager: M,
    ) -> Result<ProcessActionResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
    {
        let action_data = self
            .action_service
            .get_action_data(action_id)
            .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

        let link_model = self
            .link_v3_repository
            .get(&action_data.action.link_id)
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let link = LinkFactoryV3::create_from_link_model(link_model, canister_id)?;
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
        self.link_v3_repository.update(result.link.clone());
        self.action_service.update_action_data(
            result.process_action_result.action.clone(),
            result.process_action_result.intents.clone(),
            &result.process_action_result.intent_txs_map,
        )?;
        self.action_service.update_link_user_state(&result);

        // format response
        let link_shared = result.link.to_shared();
        let action_shared = result
            .process_action_result
            .action
            .to_shared(result.process_action_result.intents);

        Ok(ProcessActionResponseV3 {
            link: link_shared,
            action: action_shared,
            icrc112_requests: result.process_action_result.icrc112_requests,
            is_success: result.process_action_result.is_success,
            errors: result.process_action_result.errors,
        })
    }

    pub async fn get_links(
        &self,
        caller: Principal,
        input: Option<PaginateInput>,
    ) -> Result<GetLinksResponseV3, CanisterError> {
        let user_links = self
            .user_link_repository
            .get_links_by_user_id(&caller, &input.unwrap_or_default());

        let link_ids = user_links
            .data
            .iter()
            .map(|link_user| link_user.link_id.clone())
            .collect();

        let links = self.link_v3_repository.get_batch(link_ids);

        let paginate_result = PaginateResult::new(links, user_links.metadata);

        // format response
        Ok(paginate_result.map(|link| link.to_shared()))
    }

    pub async fn get_link_details<M>(
        &self,
        caller: Principal,
        link_id: &str,
        options: Option<GetLinkOptions>,
        transaction_manager: M,
    ) -> Result<GetLinkResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
    {
        let link_model = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        // pick first Action and link_user_state
        let (action, link_user_state) = self
            .action_service
            .get_first_action(&caller, link_id, options);

        // build response dto
        let link_shared = link_model.to_shared();
        let action_shared: Option<ActionShared> = if let Some(action) = action {
            let action_data = self
                .action_service
                .get_action_data(&action.id)
                .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

            let create_action_result = transaction_manager.create_action(
                action,
                action_data.intents,
                Some(action_data.intent_txs),
            )?;

            let action_shared = create_action_result
                .action
                .to_shared(create_action_result.intents);

            Some(action_shared)
        } else {
            None
        };

        Ok(GetLinkResponseV3 {
            link: link_shared,
            action: action_shared,
            link_user_state,
        })
    }

    pub fn disable_link(
        &mut self,
        caller: Principal,
        link_id: &str,
    ) -> Result<DisableLinkResponseV3, CanisterError> {
        let mut link = self
            .link_v3_repository
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
        self.link_v3_repository.update(link.clone());

        // format response
        let link_shared = link.to_shared();

        Ok(DisableLinkResponseV3 { link: link_shared })
    }
}
