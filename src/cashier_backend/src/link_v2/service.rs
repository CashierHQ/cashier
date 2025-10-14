// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::Repositories;
use crate::services::action::ActionService;
use crate::{link_v2::links::factory, repositories};
use candid::Principal;
use cashier_backend_types::dto::action::ActionDto;
use cashier_backend_types::repository::link_action::v1::LinkAction;
use cashier_backend_types::repository::user_link::v1::UserLink;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, GetLinkResp, LinkDto},
    error::CanisterError,
    repository::action::v1::ActionType,
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

    pub fn create_link(
        &mut self,
        creator: Principal,
        input: CreateLinkInput,
        created_at_ts: u64,
    ) -> Result<GetLinkResp, CanisterError> {
        let link = factory::create_link(creator, input, created_at_ts)?;
        let create_action_result =
            link.create_action(creator, ActionType::CreateLink, created_at_ts)?;

        // save link & user_link to db
        let link_model = link.get_link_model();
        self.link_repository.create(link_model.clone());

        let new_user_link = UserLink {
            user_id: creator,
            link_id: link_model.id.clone(),
        };
        self.user_link_repository.create(new_user_link);

        // save action to DB
        let link_action = LinkAction {
            link_id: link_model.id.clone(),
            action_type: create_action_result.action.r#type.clone(),
            action_id: create_action_result.action.id.clone(),
            user_id: create_action_result.action.creator,
            link_user_state: None,
        };

        let _ = self.action_service.store_action_data(
            link_action,
            create_action_result.action.clone(),
            create_action_result.intents.clone(),
            create_action_result.intent_txs_map.clone(),
            create_action_result.action.creator,
        );

        Ok(GetLinkResp {
            link: LinkDto::from(link_model),
            action: Some(ActionDto::from_with_tx(
                create_action_result.action.clone(),
                create_action_result.intents.clone(),
                &create_action_result.intent_txs_map,
            )),
        })
    }

    pub async fn publish_link(
        &mut self,
        caller: Principal,
        link_id: &str,
    ) -> Result<LinkDto, CanisterError> {
        let link = self
            .link_repository
            .get(&link_id.to_string())
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
