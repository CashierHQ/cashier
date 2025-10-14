// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::Repositories;
use crate::{
    link_v2::links::factory,
    repositories::{self, action::ActionRepository, link_action::LinkActionRepository},
};
use candid::Principal;
use cashier_backend_types::dto::action::ActionDto;
use cashier_backend_types::repository::user_link::v1::UserLink;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, GetLinkResp, LinkDto},
    error::CanisterError,
    repository::action::v1::ActionType,
};

pub struct LinkV2Service<R: Repositories> {
    pub link_repository: repositories::link::LinkRepository<R::Link>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub action_repository: ActionRepository<R::Action>,
    pub link_action_repository: LinkActionRepository<R::LinkAction>,
}

#[allow(clippy::too_many_arguments)]
impl<R: Repositories> LinkV2Service<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            link_repository: repo.link(),
            link_action_repository: repo.link_action(),
            action_repository: repo.action(),
            user_link_repository: repo.user_link(),
        }
    }

    pub fn create_link(
        &mut self,
        creator: Principal,
        input: CreateLinkInput,
        created_at_ts: u64,
    ) -> Result<GetLinkResp, CanisterError> {
        let link = factory::create_link(creator, input, created_at_ts)?;
        let (create_action, intents, intent_txs_map) =
            link.create_action(creator, ActionType::CreateLink, created_at_ts)?;

        // save to db
        let link_model = link.get_link_model();
        self.link_repository.create(link_model.clone());

        let new_user_link = UserLink {
            user_id: creator,
            link_id: link_model.id.clone(),
        };
        self.user_link_repository.create(new_user_link);

        Ok(GetLinkResp {
            link: LinkDto::from(link_model),
            action: Some(ActionDto::from_with_tx(
                create_action,
                intents,
                &intent_txs_map,
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
