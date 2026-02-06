// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::link_v3::factory::LinkFactoryV3;
use crate::apps::{action::ActionService, link_v2::links::shared::receive_link::actions::create};
use crate::repositories;
use crate::repositories::Repositories;
use candid::Principal;
use cashier_backend_types::{
    dto::{action::ActionDto, link::LinkDto},
    error::CanisterError,
    link_v3::{
        dto::{
            action::{CreateActionInputV3, CreateActionResponseV3, ProcessActionResponseV3},
            link::{CreateLinkInputV3, CreateLinkResponseV3},
        },
        link_result::{LinkCreateActionResult, LinkProcessActionResult},
    },
    repository::{
        action::v1::{Action, ActionType},
        asset_info::AssetInfo,
        common::Asset,
        intent::v1::Intent,
        link::v1::LinkType,
        link_action::v1::LinkAction,
        user_link::v1::UserLink,
    },
};
use cashier_common::chain::Chain;
use cashier_shared::{
    AddressType as AddressTypeShared, Asset as AssetShared, AssetInfo as AssetInfoShared,
    types::Action as ActionShared,
};
use std::rc::Rc;
use transaction_manager::v2::traits::TransactionManager;

pub struct LinkV3Service<R: Repositories, M: TransactionManager + 'static> {
    pub link_repository: repositories::link::LinkRepository<R::Link>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub user_link_action_repository:
        repositories::user_link_action::UserLinkActionRepository<R::UserLinkAction>,
    pub action_service: ActionService<R>,
    pub transaction_manager: Rc<M>,
}

impl<R: Repositories, M: TransactionManager + 'static> LinkV3Service<R, M> {
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
        let asset_info: Vec<AssetInfo> = input
            .action
            .intents
            .iter()
            .filter(|intent| {
                intent.source_address_type == AddressTypeShared::Creator
                    && intent.dest_address_type == AddressTypeShared::Link
            })
            .map(|intent| AssetInfo {
                asset: Asset::IC {
                    address: intent.asset.address.clone(),
                },
                label: "foo".to_string(),
                amount_per_link_use_action: intent.amount.clone(),
            })
            .collect();

        let factory = LinkFactoryV3::new(self.transaction_manager.clone());
        let link_model = factory.create_link(
            link_type,
            input.title,
            asset_info,
            input.max_use_count,
            creator_id,
            created_at_ts,
            canister_id,
        )?;

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
        creator_id: Principal,
        canister_id: Principal,
        created_at_ts: u64,
    ) -> Result<CreateActionResponseV3, CanisterError> {
        let link_model = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let action_model: Action = Action::from_generated(action.clone(), link_id.to_string());
        let intent_models: Vec<Intent> = action
            .intents
            .iter()
            .map(|i| Intent::from_generated(i.clone(), Chain::IC, "bar".to_string(), created_at_ts))
            .collect();

        let factory = LinkFactoryV3::new(self.transaction_manager.clone());
        let link = factory.create_from_link(link_model, canister_id)?;
        let result = link
            .create_action(creator_id, action_model, intent_models)
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

        // format response
        let link_shared = result.link.into_generated();
        let creator_address_type: AddressTypeShared = {
            match link_shared.link_type {
                cashier_shared::types::LinkType::TipLink => match action.action_type {
                    cashier_shared::types::ActionType::CreateLink => AddressTypeShared::Creator,
                    _ => AddressTypeShared::Link,
                },
                _ => unimplemented!(),
            }
        };
        let action_shared = result
            .create_action_result
            .action
            .into_generated(result.create_action_result.intents);

        Ok(CreateActionResponseV3 {
            link: link_shared,
            action: action_shared,
            icrc112_requests: result.create_action_result.icrc112_requests,
        })
    }

    pub async fn process_action(
        &mut self,
        link_id: &str,
        action_id: &str,
        caller: Principal,
        canister_id: Principal,
    ) -> Result<ProcessActionResponseV3, CanisterError> {
        let action_data = self
            .action_service
            .get_action_data(action_id)
            .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

        let link_model = self
            .link_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let factory = LinkFactoryV3::new(self.transaction_manager.clone());
        let link = factory.create_from_link(link_model, canister_id)?;
        let result = link
            .process_action(
                caller,
                action_data.action.clone(),
                action_data.intents.clone(),
                action_data.intent_txs.clone(),
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

        // format response
        let link_shared = result.link.into_generated();
        let action_shared = result
            .process_action_result
            .action
            .into_generated(result.process_action_result.intents);

        Ok(ProcessActionResponseV3 {
            link: link_shared,
            action: action_shared,
            icrc112_requests: result.process_action_result.icrc112_requests,
            is_success: result.process_action_result.is_success,
            errors: result.process_action_result.errors,
        })
    }
}
