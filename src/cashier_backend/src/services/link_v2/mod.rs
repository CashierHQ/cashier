// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    link_v2::validation,
    repositories::{self, action::ActionRepository, link_action::LinkActionRepository},
    services::{
        action::ActionService,
        ext::icrc_batch::IcrcBatchService,
        link::{
            service::LinkService,
            traits::{ActionFlow, LinkStateMachine},
        },
        request_lock::RequestLockService,
        transaction_manager::service::TransactionManagerService,
    },
    utils::icrc::IcrcService,
};
use crate::{repositories::Repositories, services::link::traits::LinkValidation};
use candid::Principal;
use cashier_backend_types::dto::{
    action::CreateActionInput,
    link::{CreateLinkInput, GetLinkResp, LinkDto},
};
use cashier_backend_types::{
    dto::{
        action::ActionDto,
        link::{GetLinkOptions, LinkDetailUpdateAssetInfoInput},
    },
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        asset_info::AssetInfo,
        link::v1::{Link, LinkState, LinkType},
        link_action::v1::LinkAction,
        user_link::v1::UserLink,
    },
    service::link::{PaginateInput, PaginateResult},
};
use cashier_common::runtime::IcEnvironment;
use log::error;
use std::rc::Rc;
use uuid::Uuid;

pub struct LinkV2Service<E: IcEnvironment + Clone + 'static, R: Repositories + 'static> {
    pub link_service: LinkService<E, R>,
    pub action_service: ActionService<R>,
}

#[allow(clippy::too_many_arguments)]
impl<E: IcEnvironment + Clone + 'static, R: Repositories + 'static> LinkV2Service<E, R> {
    pub fn new(repo: Rc<R>, ic_env: E) -> Self {
        Self {
            link_service: LinkService::new(repo.clone(), ic_env.clone()),
            action_service: ActionService::new(&repo),
        }
    }

    pub async fn create_link(
        &mut self,
        user_id: Principal,
        input: CreateLinkInput,
        ts: u64,
    ) -> Result<GetLinkResp, CanisterError> {
        let link = self.link_service.create_link(user_id, input)?;

        let create_action_input = CreateActionInput {
            link_id: link.id.clone(),
            action_type: ActionType::CreateLink,
        };

        let action = self
            .link_service
            .create_action(ts, &create_action_input, user_id)
            .await?;

        Ok(GetLinkResp {
            link: LinkDto::from(link),
            action: Some(action),
        })
    }
}
