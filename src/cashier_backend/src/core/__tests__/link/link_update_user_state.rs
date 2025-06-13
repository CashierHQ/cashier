// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


mod tests {
    use std::collections::HashMap;

    use candid::Principal;
    use cashier_types::{Action, ActionState, ActionType, LinkAction, LinkUserState};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        core::link::{api::LinkApi, types::LinkUpdateUserStateInput},
        services::{
            __tests__::tests::{
                create_dummy_intent, create_dummy_transaction, generate_action_intent,
                generate_random_principal, MockIcEnvironment,
            },
            link::v2::LinkService,
            transaction_manager::{action::ActionService, TransactionManagerService},
            user::v2::UserService,
        },
        types::{error::CanisterError, transaction_manager::ActionData},
    };

    #[tokio::test]
    async fn should_update_success_user_state_for_link_update_user_state() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();

        let link_id = Uuid::new_v4().to_string();
        let action_type = "Claim".to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_id = Uuid::new_v4().to_string();
        let caller = generate_random_principal();

        let mut link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            user_id: user_id.clone(),
            action_id: action_id.clone(),
            link_user_state: Some(LinkUserState::CompletedLink),
        };

        let action = Action {
            id: action_id.clone(),
            link_id: link_id.clone(),
            r#type: ActionType::Use ,
            state: ActionState::Success,
            creator: user_id.clone(),
        };

        let intent1 = create_dummy_intent(cashier_types::IntentState::Success);
        let intent2 = create_dummy_intent(cashier_types::IntentState::Success);

        let intents = vec![intent1.clone(), intent2.clone()];

        let tx1 = create_dummy_transaction(cashier_types::TransactionState::Success);
        let tx2 = create_dummy_transaction(cashier_types::TransactionState::Success);
        let tx3 = create_dummy_transaction(cashier_types::TransactionState::Success);

        let mut intent_txs = HashMap::new();
        intent_txs.insert(intent1.id.clone(), vec![tx1.clone(), tx2.clone()]);
        intent_txs.insert(intent2.id.clone(), vec![tx3.clone()]);

        let action_resp = ActionData {
            action: action.clone(),
            intents,
            intent_txs,
        };

        when!(ic_env.caller).then_return(caller);
        when!(user_service.get_user_id_by_wallet).then_return(Some(user_id.clone()));
        when!(link_service.handle_user_link_state_machine).then_return(Ok(link_action.clone()));
        when!(action_service.get).then_return(Ok(action_resp));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = LinkUpdateUserStateInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            anonymous_wallet_address: None,
            goto: "Continue".to_string(),
        };

        let result = api.link_update_user_state(input);

        assert!(result.is_ok());
        let output = result.unwrap().unwrap();
        assert_eq!(output.link_user_state, "User_state_completed_link");
        assert_eq!(output.action.state, ActionState::Success.to_string());
        assert_eq!(output.action.r#type, ActionType::Use .to_string());
    }

    #[tokio::test]
    async fn should_return_error_if_invalid_state_transition_for_link_update_user_state() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let mut action_service = ActionService::faux();

        let link_id = Uuid::new_v4().to_string();
        let action_type = "Claim".to_string();
        let user_id = Uuid::new_v4().to_string();
        let caller = generate_random_principal();

        when!(ic_env.caller).then_return(caller);
        when!(user_service.get_user_id_by_wallet).then_return(Some(user_id.clone()));
        when!(link_service.handle_user_link_state_machine).then_return(Err(
            CanisterError::HandleLogicError("Invalid state transition".to_string()),
        ));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = LinkUpdateUserStateInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            anonymous_wallet_address: None,
            goto: "Continue".to_string(),
        };

        let result = api.link_update_user_state(input);

        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
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

        let input = LinkUpdateUserStateInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "Claim".to_string(),
            anonymous_wallet_address: Some(caller.to_text()),
            goto: "Continue".to_string(),
        };

        let result = api.link_update_user_state(input);

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

        let input = LinkUpdateUserStateInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "Claim".to_string(),
            anonymous_wallet_address: None,
            goto: "Continue".to_string(),
        };

        let result = api.link_update_user_state(input);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Cannot have both empty session key & anonymous_wallet_address"),);
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

        let input = LinkUpdateUserStateInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "InvalidActionType".to_string(),
            anonymous_wallet_address: None,
            goto: "Continue".to_string(),
        };

        let result = api.link_update_user_state(input);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid action type"),);
    }

    #[tokio::test]
    async fn should_fail_when_goto_is_invalid() {
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

        let input = LinkUpdateUserStateInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "Claim".to_string(),
            anonymous_wallet_address: None,
            goto: "InvalidGoto".to_string(),
        };

        let result = api.link_update_user_state(input);

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid goto"),);
    }
}
