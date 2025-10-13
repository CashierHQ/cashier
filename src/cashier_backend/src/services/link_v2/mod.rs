// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::link::traits::{ActionFlow, LinkStateMachine};
use crate::{
    link_v2::factory,
    repositories::{self, action::ActionRepository, link_action::LinkActionRepository},
    services::{
        action::ActionService, ext::icrc_batch::IcrcBatchService, request_lock::RequestLockService,
        transaction_manager::service::TransactionManagerService,
    },
    utils::icrc::IcrcService,
};
use crate::{repositories::Repositories, services::link::traits::LinkValidation};
use candid::Principal;
use cashier_backend_types::dto::link::LinkDetailUpdateAssetInfoInput;
use cashier_backend_types::repository::asset_info::AssetInfo;
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::user_link::v1::UserLink;
use cashier_backend_types::{
    dto::{
        action::CreateActionInput,
        link::{CreateLinkInput, GetLinkOptions, GetLinkResp, LinkDto},
    },
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        link::v1::Link,
        link_action::v1::LinkAction,
    },
    service::link::{PaginateInput, PaginateResult},
};
use cashier_common::runtime::IcEnvironment;
use log::error;
use std::rc::Rc;
use uuid::Uuid;

pub struct LinkV2Service<E: IcEnvironment + Clone, R: Repositories> {
    // LinkService fields go here
    pub link_repository: repositories::link::LinkRepository<R::Link>,
    pub link_action_repository: LinkActionRepository<R::LinkAction>,
    pub action_repository: ActionRepository<R::Action>,
    pub action_service: ActionService<R>,
    pub icrc_service: IcrcService,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub ic_env: E,
    pub request_lock_service: RequestLockService<R>,
    pub icrc_batch_service: IcrcBatchService,
    pub tx_manager_service: TransactionManagerService<E, R>,
}

#[allow(clippy::too_many_arguments)]
impl<E: IcEnvironment + Clone, R: Repositories> LinkV2Service<E, R> {
    pub fn new(repo: Rc<R>, ic_env: E) -> Self {
        Self {
            link_repository: repo.link(),
            link_action_repository: repo.link_action(),
            action_repository: repo.action(),
            action_service: ActionService::new(&repo),
            icrc_service: IcrcService::new(),
            user_link_repository: repo.user_link(),
            request_lock_service: RequestLockService::new(&repo),
            icrc_batch_service: IcrcBatchService::new(),
            tx_manager_service: TransactionManagerService::new(repo, ic_env.clone()),
            ic_env,
        }
    }

    pub fn create_link(
        &mut self,
        creator: Principal,
        input: CreateLinkInput,
    ) -> Result<GetLinkResp, CanisterError> {
        let ts = self.ic_env.time();

        let link = factory::create_link(creator, input, ts)?;
        let action = link.create_action(creator, ActionType::CreateLink)?;

        let link_data = link.get_link_data();
        self.link_repository.create(link_data.clone());

        let new_user_link = UserLink {
            user_id: creator,
            link_id: link_data.id.clone(),
        };
        self.user_link_repository.create(new_user_link);

        Ok(GetLinkResp {
            link: LinkDto::from(link_data),
            action: Some(action),
        })
    }

    pub async fn publish_link(
        &mut self,
        caller: Principal,
        link_id: String,
    ) -> Result<LinkDto, CanisterError> {
        let link = self
            .link_repository
            .get(&link_id)
            .ok_or_else(|| CanisterError::from("Link not found"))?;

        if link.creator != caller {
            return Err(CanisterError::from("Only the creator can publish the link"));
        }

        let link = factory::from_link(link)?;
        let published_link = link.publish().await?;
        self.link_repository.update(published_link.clone());

        Ok(LinkDto::from(published_link))
    }
}
