mod tests {
    use cashier_types::{Action, ActionType, Link, LinkType};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        repositories::{
            action::ActionRepository, link::LinkRepository, link_action::LinkActionRepository,
        },
        services::{
            __tests__::tests::{generate_timestamp, MockIcEnvironment},
            link::v2::LinkService,
        },
        types::error::CanisterError,
    };

    #[test]
    fn should_validate_user_update_action_success() {
        let ic_env = MockIcEnvironment::faux();
        let mut link_repository = LinkRepository::faux();
        let link_action_repository = LinkActionRepository::faux();
        let action_repository = ActionRepository::faux();

        let link_id = Uuid::new_v4().to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_type = ActionType::Withdraw;

        let link = Link {
            id: link_id.clone(),
            creator: user_id.clone(),
            link_type: Some(LinkType::TipLink),
            state: cashier_types::LinkState::ChooseLinkType,
            title: Some("title".to_string()),
            description: Some("description".to_string()),
            asset_info: None,
            template: Some(cashier_types::Template::Central),
            create_at: generate_timestamp(),
            metadata: None,
        };

        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: action_type.clone(),
            state: cashier_types::ActionState::Created,
            creator: Uuid::new_v4().to_string(),
            link_id: link_id.clone(),
        };

        when!(link_repository.get).then_return(Some(link));

        let link_service: LinkService<MockIcEnvironment> = LinkService::new(
            link_repository,
            link_action_repository,
            action_repository,
            ic_env,
        );

        let result = link_service.link_validate_user_update_action(&action, &user_id);

        assert!(result.is_ok());
    }

    #[test]
    fn should_return_error_if_user_not_creator_of_action() {
        let ic_env = MockIcEnvironment::faux();
        let mut link_repository = LinkRepository::faux();
        let link_action_repository = LinkActionRepository::faux();
        let action_repository = ActionRepository::faux();

        let link_id = Uuid::new_v4().to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_type = ActionType::Withdraw;

        let link = Link {
            id: link_id.clone(),
            creator: Uuid::new_v4().to_string(),
            link_type: Some(LinkType::TipLink),
            state: cashier_types::LinkState::ChooseLinkType,
            title: Some("title".to_string()),
            description: Some("description".to_string()),
            asset_info: None,
            template: Some(cashier_types::Template::Central),
            create_at: generate_timestamp(),
            metadata: None,
        };

        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: action_type.clone(),
            state: cashier_types::ActionState::Created,
            creator: Uuid::new_v4().to_string(),
            link_id: link_id.clone(),
        };

        when!(link_repository.get).then_return(Some(link));

        let link_service: LinkService<MockIcEnvironment> = LinkService::new(
            link_repository,
            link_action_repository,
            action_repository,
            ic_env,
        );

        let result = link_service.link_validate_user_update_action(&action, &user_id);

        assert!(result.is_ok());
    }
}
