mod tests {
    use cashier_types::{Action, ActionState, LinkAction, LinkUserState};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        core::link::types::UserStateMachineGoto,
        repositories::{
            action::ActionRepository, link::LinkRepository, link_action::LinkActionRepository,
            user_link::UserLinkRepository, user_wallet::UserWalletRepository,
        },
        services::{__tests__::tests::MockIcEnvironment, link::v2::LinkService},
        types::error::CanisterError,
        utils::icrc::IcrcService,
    };

    #[test]
    fn should_handle_user_link_state_machine_success() {
        let ic_env = MockIcEnvironment::faux();
        let link_repository = LinkRepository::faux();
        let mut link_action_repository = LinkActionRepository::faux();
        let mut action_repository = ActionRepository::faux();
        let icrc_service = IcrcService::faux();
        let user_wallet_repository = UserWalletRepository::faux();
        let user_link_repository = UserLinkRepository::faux();

        let link_id = Uuid::new_v4().to_string();
        let action_type = "Claim".to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_id = Uuid::new_v4().to_string();

        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            user_id: user_id.clone(),
            action_id,
            link_user_state: Some(LinkUserState::ChooseWallet),
        };

        let action = Action {
            id: Uuid::new_v4().to_string(),
            link_id: link_id.clone(),
            r#type: cashier_types::ActionType::Claim,
            state: ActionState::Success,
            creator: user_id.clone(),
        };

        when!(link_action_repository.get_by_prefix).then_return(vec![link_action.clone()]);
        when!(action_repository.get).then_return(Some(action.clone()));
        when!(link_action_repository.update).then_return(());

        let link_service: LinkService<MockIcEnvironment> = LinkService::new(
            link_repository,
            link_action_repository,
            action_repository,
            icrc_service,
            user_wallet_repository,
            user_link_repository,
            ic_env,
        );

        let result = link_service.handle_user_link_state_machine(
            link_id.clone(),
            action_type.clone(),
            user_id.clone(),
            UserStateMachineGoto::Continue,
        );

        assert!(result.is_ok());
        let updated_link_action = result.unwrap();
        assert_eq!(
            updated_link_action.link_user_state,
            Some(LinkUserState::CompletedLink)
        );
    }

    #[test]
    fn should_return_error_if_action_not_found() {
        let ic_env = MockIcEnvironment::faux();
        let mut link_repository = LinkRepository::faux();
        let mut link_action_repository = LinkActionRepository::faux();
        let mut action_repository = ActionRepository::faux();
        let icrc_service = IcrcService::faux();
        let user_wallet_repository = UserWalletRepository::faux();
        let user_link_repository = UserLinkRepository::faux();

        let link_id = Uuid::new_v4().to_string();
        let action_type = "Claim".to_string();
        let user_id = Uuid::new_v4().to_string();

        when!(link_action_repository.get_by_prefix).then_return(vec![]);
        when!(action_repository.get).then_return(None);

        let link_service: LinkService<MockIcEnvironment> = LinkService::new(
            link_repository,
            link_action_repository,
            action_repository,
            icrc_service,
            user_wallet_repository,
            user_link_repository,
            ic_env,
        );

        let result = link_service.handle_user_link_state_machine(
            link_id.clone(),
            action_type.clone(),
            user_id.clone(),
            UserStateMachineGoto::Continue,
        );

        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[test]
    fn should_return_error_if_invalid_state_transition() {
        let ic_env = MockIcEnvironment::faux();
        let link_repository = LinkRepository::faux();
        let mut link_action_repository = LinkActionRepository::faux();
        let action_repository = ActionRepository::faux();
        let icrc_service = IcrcService::faux();
        let user_wallet_repository = UserWalletRepository::faux();
        let user_link_repository = UserLinkRepository::faux();

        let link_id = Uuid::new_v4().to_string();
        let action_type = "Claim".to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_id = Uuid::new_v4().to_string();

        let mut link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            user_id: user_id.clone(),
            link_user_state: Some(LinkUserState::CompletedLink),
            action_id,
        };

        when!(link_action_repository.get_by_prefix).then_return(vec![link_action.clone()]);

        let link_service: LinkService<MockIcEnvironment> = LinkService::new(
            link_repository,
            link_action_repository,
            action_repository,
            icrc_service,
            user_wallet_repository,
            user_link_repository,
            ic_env,
        );

        let result = link_service.handle_user_link_state_machine(
            link_id.clone(),
            action_type.clone(),
            user_id.clone(),
            UserStateMachineGoto::Continue,
        );

        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }
}
