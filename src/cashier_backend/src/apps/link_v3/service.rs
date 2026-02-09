// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::link_v3::factory::LinkFactoryV3;
use crate::apps::{
    action::v3::ActionServiceV3, link_v2::links::shared::receive_link::actions::create,
};
use crate::repositories;
use crate::repositories::Repositories;
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::{
        dto::{
            action::{CreateActionInputV3, CreateActionResponseV3, ProcessActionResponseV3},
            link::{CreateLinkInputV3, CreateLinkResponseV3},
        },
        link_result::{LinkCreateActionResult, LinkProcessActionResult},
    },
    repository::{
        action::v3::ActionV3, asset::v1::Asset, asset_info::v3::AssetInfoV3, intent::v3::IntentV3,
        link::v1::LinkType, link_action::v1::LinkAction, user_link::v1::UserLink,
    },
};
use cashier_shared::{
    AddressType as AddressTypeShared, Asset as AssetShared, AssetInfo as AssetInfoShared,
    types::Action as ActionShared,
};
use std::rc::Rc;
use transaction_manager::v3::traits::TransactionManagerV3;

pub struct LinkV3Service<R: Repositories, M: TransactionManagerV3 + 'static> {
    pub link_v3_repository: repositories::link::v3::LinkV3Repository<R::LinkV3>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub user_link_action_repository:
        repositories::user_link_action::UserLinkActionRepository<R::UserLinkAction>,
    pub action_service: ActionServiceV3<R>,
    pub transaction_manager: Rc<M>,
}

impl<R: Repositories, M: TransactionManagerV3 + 'static> LinkV3Service<R, M> {
    pub fn new(repo: &R, transaction_manager: Rc<M>) -> Self {
        Self {
            link_v3_repository: repo.link_v3(),
            user_link_repository: repo.user_link(),
            user_link_action_repository: repo.user_link_action(),
            action_service: ActionServiceV3::new(repo),
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
        input: CreateLinkInputV3,
        creator_id: Principal,
        canister_id: Principal,
        created_at_ts: u64,
    ) -> Result<CreateActionResponseV3, CanisterError> {
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
            .map(|i| AssetInfoV3::from(IntentV3::from(i.clone())))
            .collect();

        let factory = LinkFactoryV3::new(self.transaction_manager.clone());
        let link_model = factory.create_link(
            link_type,
            input.title,
            asset_info,
            input.max_use,
            creator_id,
            created_at_ts,
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
                created_at_ts,
            )
            .await?;

        Ok(action_result)
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
        link_id: &str,
        action: ActionShared,
        creator: Principal,
        canister_id: Principal,
        created_at_ts: u64,
    ) -> Result<CreateActionResponseV3, CanisterError> {
        let link_model = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let action_model = self.action_service.create_action_from_shared_data(
            action.clone(),
            Some(link_id.to_string()),
            creator,
        );

        let intent_models: Vec<IntentV3> = action
            .intents
            .iter()
            .map(|i| IntentV3::from(i.clone()))
            .collect();

        let factory = LinkFactoryV3::new(self.transaction_manager.clone());
        let link_instance = factory.create_from_link_model(link_model, canister_id)?;
        let result = link_instance
            .create_action(creator, action_model, intent_models)
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
            link_action.clone(),
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
}
