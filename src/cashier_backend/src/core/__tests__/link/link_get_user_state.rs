// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


mod tests {
    use candid::Principal;
    use cashier_types::{Action, ActionState, ActionType, LinkAction, LinkUserState};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        core::link::{api::LinkApi, types::LinkGetUserStateInput},
        services::{
            __tests__::tests::{generate_random_principal, MockIcEnvironment},
            link::v2::LinkService,
            transaction_manager::{action::ActionService, TransactionManagerService},
            user::v2::UserService,
        },
    };

    #[tokio::test]
    async fn should_return_user_state_for_link_get_user_state() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let 

        let link_id = Uuid::new_v4().to_string();
        let action_type = "Claim".to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_id = Uuid::new_v4().to_string();
        let caller = generate_random_principal();

        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            user_id: user_id.clone(),
            action_id: action_id.clone(),
            link_user_state: Some(LinkUserState::ChooseWallet),
        };

        let action = Action {
            id: action_id.clone(),
            link_id: link_id.clone(),
            r#type: ActionType::Use ,
            state: ActionState::Created,
            creator: user_id.clone(),
        };

        when!(ic_env.caller).then_return(caller);
        when!(user_service.get_user_id_by_wallet).then_return(Some(user_id.clone()));
        when!(link_service.get_link_action_user).then_return(Ok(Some(link_action.clone())));
        when!(action_service.get_action_by_id).then_return(Some(action.clone()));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = LinkGetUserStateInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            anonymous_wallet_address: None,
        };

        let result = api.link_get_user_state(input);

        assert!(result.is_ok());
        let output = result.unwrap().unwrap();
        assert_eq!(output.link_user_state, "User_state_choose_wallet");
        assert_eq!(output.action.state, ActionState::Created.to_string());
        assert_eq!(output.action.r#type, ActionType::Use .to_string());
    }

    #[tokio::test]
    async fn should_fail_when_both_session_key_and_anonymous_wallet_address_are_provided() {
        let link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let action_service = ActionService::faux();

        let caller = generate_random_principal();
        let user_id = Uuid::new_v4().to_string();
        when!(ic_env.caller).then_return(caller);
        when!(user_service.get_user_id_by_wallet).then_return(Some(user_id));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = LinkGetUserStateInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "Claim".to_string(),
            anonymous_wallet_address: Some(caller.to_text()),
        };

        let result = api.link_get_user_state(input);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Cannot have both session key & anonymous_wallet_address"),);
    }

    #[tokio::test]
    async fn should_fail_when_both_session_key_and_anonymous_wallet_address_are_empty() {
        let link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let action_service = ActionService::faux();

        let caller = Principal::anonymous();
        when!(ic_env.caller).then_return(caller);
        when!(user_service.get_user_id_by_wallet).then_return(None);

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = LinkGetUserStateInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "Claim".to_string(),
            anonymous_wallet_address: None,
        };

        let result = api.link_get_user_state(input);

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn should_fail_when_action_type_is_invalid() {
        let link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let action_service = ActionService::faux();

        let caller = generate_random_principal();
        when!(ic_env.caller).then_return(caller);
        when!(user_service.get_user_id_by_wallet).then_return(Some(Uuid::new_v4().to_string()));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = LinkGetUserStateInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "InvalidActionType".to_string(),
            anonymous_wallet_address: None,
        };

        let result = api.link_get_user_state(input);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid action type"),)
    }

    #[tokio::test]
    async fn should_fail_when_action_type_is_not_claim() {
        let link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let action_service = ActionService::faux();

        let caller = generate_random_principal();
        when!(ic_env.caller).then_return(caller);
        when!(user_service.get_user_id_by_wallet).then_return(Some(Uuid::new_v4().to_string()));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = LinkGetUserStateInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "Withdraw".to_string(),
            anonymous_wallet_address: None,
        };

        let result = api.link_get_user_state(input);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid action type"),)
    }
}
