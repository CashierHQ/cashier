use crate::{
    repositories::Repositories,
    services::link::{
        service::LinkService,
        traits::{LinkStateMachine, LinkValidation},
    },
};
use candid::Principal;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput, LinkStateMachineGoto},
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        link::v1::{Link, LinkState, Template},
        link_action::v1::LinkAction,
        user_link::v1::UserLink,
    },
};
use cashier_common::runtime::IcEnvironment;
use log::error;
use uuid::Uuid;

impl<E: IcEnvironment + Clone, R: Repositories> LinkStateMachine for LinkService<E, R> {
    async fn create_link(
        &mut self,
        user_id: Principal,
        input: CreateLinkInput,
    ) -> Result<Link, CanisterError> {
        let ts = self.ic_env.time();
        let id = Uuid::new_v4();
        let link_id_str = id.to_string();

        let new_link = Link {
            id: link_id_str.clone(),
            state: LinkState::CreateLink,
            // should be a mandatory field
            title: Some(input.title),
            // should be a mandatory field
            link_type: Some(input.link_type),
            // should be removed
            description: None,
            // should be removed
            template: Some(Template::Central),
            asset_info: input
                .asset_info
                .iter()
                .map(LinkDetailUpdateAssetInfoInput::to_model)
                .collect(),
            creator: user_id,
            create_at: ts,
            metadata: Default::default(),
            link_use_action_counter: 0,
            link_use_action_max_count: input.link_use_action_max_count,
        };
        let new_user_link = UserLink {
            user_id,
            link_id: link_id_str.clone(),
        };

        // Create the initial link and user_link records
        self.link_repository.create(new_link.clone());
        self.user_link_repository.create(new_user_link.clone());

        Ok(new_link)
    }

    async fn handle_link_state_transition(
        &mut self,
        link_id: &str,
        link_state_goto: LinkStateMachineGoto,
    ) -> Result<Link, CanisterError> {
        let mut link = self.get_link_by_id(link_id)?;

        // !Start of link state machine
        // CHOOSE LINK TYPE
        if link.state == LinkState::CreateLink {
            let create_action = self.prefetch_create_action(&link)?;

            // ===== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                let create_action = create_action.ok_or_else(|| {
                    CanisterError::ValidationErrors("Create action not found".to_string())
                })?;

                if create_action.state != ActionState::Success {
                    Err(CanisterError::ValidationErrors(format!(
                        "Create action not success, current state: {:?}",
                        create_action.state
                    )))
                } else {
                    link.state = LinkState::Active;
                    self.link_repository.update(link.clone());
                    Ok(link.clone())
                }
            }
            // ===== invalid state =====
            else {
                Err(CanisterError::ValidationErrors(
                    "State transition failed for CreateLink".to_string(),
                ))
            }
        } else if link.state == LinkState::Active {
            if link_state_goto == LinkStateMachineGoto::Continue {
                if self.check_link_asset_left(&link).await? {
                    link.state = LinkState::Inactive;
                } else {
                    link.state = LinkState::InactiveEnded;
                }
                self.link_repository.update(link.clone());
                Ok(link.clone())
            } else {
                Err(CanisterError::ValidationErrors(
                    "State transition failed for Active".to_string(),
                ))
            }
        } else if link.state == LinkState::Inactive {
            let withdraw_action = self.prefetch_withdraw_action(&link)?;
            if link_state_goto == LinkStateMachineGoto::Continue {
                if !self.check_link_asset_left(&link).await? {
                    if let Some(action) = withdraw_action {
                        if action.state == ActionState::Success {
                            link.state = LinkState::InactiveEnded;
                            self.link_repository.update(link.clone());
                            Ok(link.clone())
                        } else {
                            error!("withdraw_action not success {:?}", action);
                            Err(CanisterError::ValidationErrors(
                                "Withdraw action not success".to_string(),
                            ))
                        }
                    } else {
                        error!("withdraw_action is None");
                        Err(CanisterError::ValidationErrors(
                            "Withdraw action not found".to_string(),
                        ))
                    }
                } else {
                    Err(CanisterError::ValidationErrors(
                        "Link still has assets left".to_string(),
                    ))
                }
            } else {
                Err(CanisterError::ValidationErrors(
                    "State transition failed for Inactive".to_string(),
                ))
            }
        } else if link.state == LinkState::InactiveEnded {
            Err(CanisterError::ValidationErrors("Link is ended".to_string()))
        } else {
            Err(CanisterError::ValidationErrors("Invalid state".to_string()))
        }
        // !End of link state machine
    }

    fn prefetch_create_action(&self, link: &Link) -> Result<Option<Action>, CanisterError> {
        let link_creation_action: Vec<LinkAction> = self.link_action_repository.get_by_prefix(
            &link.id,
            &ActionType::CreateLink,
            &link.creator,
        );

        let Some(link_creation_action) = link_creation_action.first() else {
            return Ok(None);
        };

        let create_action = self.action_repository.get(&link_creation_action.action_id);

        Ok(create_action)
    }

    fn prefetch_withdraw_action(&self, link: &Link) -> Result<Option<Action>, CanisterError> {
        let link_withdraw_action: Vec<LinkAction> = self.link_action_repository.get_by_prefix(
            &link.id,
            &ActionType::Withdraw,
            &link.creator,
        );

        if link_withdraw_action.is_empty() {
            return Ok(None);
        }

        let Some(withdraw_action) = link_withdraw_action.first() else {
            return Ok(None);
        };

        let withdraw_action = self.action_repository.get(&withdraw_action.action_id);

        Ok(withdraw_action)
    }
}

#[cfg(test)]
mod tests {
    use cashier_backend_types::constant::INTENT_LABEL_SEND_TIP_ASSET;
    use cashier_backend_types::repository::{common::Asset, link::v1::LinkType};

    use super::*;
    use crate::repositories::tests::TestRepositories;
    use crate::services::link::test_fixtures::*;
    use crate::utils::test_utils::{random_principal_id, runtime::MockIcEnvironment};
    use std::rc::Rc;

    #[test]
    fn it_should_return_empty_prefetch_create_action_if_link_not_found() {
        // Arrange
        let mut service =
            LinkService::new(Rc::new(TestRepositories::new()), MockIcEnvironment::new());
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);

        // Act
        let result = service.prefetch_create_action(&link);

        // Assert
        assert!(result.is_ok());

        let action = result.unwrap();
        assert!(action.is_none());
    }

    #[test]
    fn it_should_prefetch_create_action() {
        // Arrange
        let mut service =
            LinkService::new(Rc::new(TestRepositories::new()), MockIcEnvironment::new());
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let _link_action =
            create_link_action_fixture(&mut service, &link.id, ActionType::CreateLink, creator_id);

        // Act
        let result = service.prefetch_create_action(&link);

        // Assert
        assert!(result.is_ok());

        let action = result.unwrap();
        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.link_id, link.id);
        assert_eq!(action.r#type, ActionType::CreateLink);
        assert_eq!(action.creator, creator_id);
    }

    #[test]
    fn it_should_return_empty_prefetch_withdraw_action_if_link_not_found() {
        // Arrange
        let mut service =
            LinkService::new(Rc::new(TestRepositories::new()), MockIcEnvironment::new());
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);

        // Act
        let result = service.prefetch_withdraw_action(&link);

        // Assert
        assert!(result.is_ok());

        let action = result.unwrap();
        assert!(action.is_none());
    }

    #[test]
    fn it_should_prefetch_withdraw_action() {
        // Arrange
        let mut service =
            LinkService::new(Rc::new(TestRepositories::new()), MockIcEnvironment::new());
        let creator_id = random_principal_id();
        let link = create_link_fixture(&mut service, creator_id);
        let _link_action =
            create_link_action_fixture(&mut service, &link.id, ActionType::Withdraw, creator_id);

        // Act
        let result = service.prefetch_withdraw_action(&link);

        // Assert
        assert!(result.is_ok());

        let action = result.unwrap();
        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.link_id, link.id);
        assert_eq!(action.r#type, ActionType::Withdraw);
        assert_eq!(action.creator, creator_id);
    }

    #[tokio::test]
    #[allow(deprecated)]
    async fn it_should_create_link_with_create_link_state() {
        // Arrange
        let mut service =
            LinkService::new(Rc::new(TestRepositories::new()), MockIcEnvironment::new());
        let creator_id = random_principal_id();
        let mock_asset_info = LinkDetailUpdateAssetInfoInput {
            asset: Asset::IC {
                address: random_principal_id(),
            },
            label: INTENT_LABEL_SEND_TIP_ASSET.to_string(),
            amount_per_link_use_action: 1000000, // 0.01 ICP (8 decimals)
        };
        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            link_use_action_max_count: 100,
            asset_info: vec![mock_asset_info.clone()],
        };

        // Act
        let result = service.create_link(creator_id, input).await;

        // Assert
        assert!(result.is_ok());
        let link = result.unwrap();
        assert_eq!(link.state, LinkState::CreateLink);
        assert_eq!(link.creator, creator_id);
        assert_eq!(link.title, Some("Test Link".to_string()));
        assert_eq!(link.link_type, Some(LinkType::SendTip));
        assert_eq!(link.link_use_action_max_count, 100);
        assert_eq!(link.asset_info.len(), 1);
        assert_eq!(
            link.asset_info[0].label,
            INTENT_LABEL_SEND_TIP_ASSET.to_string()
        );
        assert_eq!(link.asset_info[0].amount_per_link_use_action, 1000000);
    }
}
