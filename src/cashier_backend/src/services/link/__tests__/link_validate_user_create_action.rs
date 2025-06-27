// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


mod tests {
    use cashier_types::{ActionType, Link, LinkType};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        repositories::{
            action::ActionRepository,
            link::LinkRepository,
            link_action::LinkActionRepository,
            user_wallet::{self, UserWalletRepository},
        },
        services::{
            __tests__::tests::{generate_random_principal, generate_timestamp, MockIcEnvironment},
            link::v2::LinkService,
        },
        types::error::CanisterError,
        utils::icrc::IcrcService,
    };

    #[tokio::test]
    async fn should_validate_user_create_action_success() {
        let ic_env = MockIcEnvironment::faux();
        let mut link_repository = LinkRepository::faux();
        let link_action_repository = LinkActionRepository::faux();
        let action_repository = ActionRepository::faux();
        let user_wallet_repository = UserWalletRepository::faux();
        let icrc_service = IcrcService::faux();

        let link_id = Uuid::new_v4().to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_type = ActionType::Withdraw;
        let caller = generate_random_principal();

        let link = Link {
            id: link_id.clone(),
            creator: user_id.clone(),
            link_type: Some(LinkType::SendTip),
            state: cashier_types::LinkState::ChooseLinkType,
            title: Some("title".to_string()),
            description: Some("description".to_string()),
            asset_info: None,
            template: Some(cashier_types::Template::Central),
            create_at: generate_timestamp(),
            metadata: None,
        };

        when!(link_repository.get).then_return(Some(link));

        let link_service: LinkService<MockIcEnvironment> = LinkService::new(
            link_repository,
            link_action_repository,
            action_repository,
            icrc_service,
            user_wallet_repository,
            ic_env,
        );

        let result = link_service
            .link_validate_user_create_action(&link_id, &action_type, &user_id, &caller)
            .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn should_return_error_if_user_not_creator() {
        let ic_env = MockIcEnvironment::faux();
        let mut link_repository = LinkRepository::faux();
        let link_action_repository = LinkActionRepository::faux();
        let action_repository = ActionRepository::faux();
        let icrc_service = IcrcService::faux();
        let user_wallet_repository = UserWalletRepository::faux();
        let caller = generate_random_principal();

        let link_id = Uuid::new_v4().to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_type = ActionType::Withdraw;

        let link = Link {
            id: link_id.clone(),
            creator: Uuid::new_v4().to_string(),
            link_type: Some(LinkType::SendTip),
            state: cashier_types::LinkState::ChooseLinkType,
            title: Some("title".to_string()),
            description: Some("description".to_string()),
            asset_info: None,
            template: Some(cashier_types::Template::Central),
            create_at: generate_timestamp(),
            metadata: None,
        };

        when!(link_repository.get).then_return(Some(link));

        let link_service: LinkService<MockIcEnvironment> = LinkService::new(
            link_repository,
            link_action_repository,
            action_repository,
            icrc_service,
            user_wallet_repository,
            ic_env,
        );

        let result = link_service
            .link_validate_user_create_action(&link_id, &action_type, &user_id, &caller)
            .await;

        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }
}
