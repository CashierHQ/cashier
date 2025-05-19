mod tests {
    use candid::Principal;
    use cashier_types::{Action, ActionState, ActionType, LinkUserState};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        core::{
            action::types::{ActionDto, ProcessActionAnonymousInput},
            link::api::LinkApi,
        },
        services::{
            __tests__::tests::{generate_random_principal, MockIcEnvironment},
            link::v2::LinkService,
            transaction_manager::{action::ActionService, TransactionManagerService},
            user::v2::UserService,
        },
        types::{error::CanisterError, temp_action::TemporaryAction},
    };

    #[tokio::test]
    async fn should_create_new_action_for_anonymous_user() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let mut tx_manager_service = TransactionManagerService::faux();

        let link_id = Uuid::new_v4().to_string();
        let wallet_address = generate_random_principal().to_string();
        let action_type = "Claim".to_string();
        let caller = Principal::anonymous();

        let temp_action = TemporaryAction {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::Use ,
            state: ActionState::Created,
            creator: format!("ANON#{}", wallet_address),
            link_id: link_id.clone(),
            intents: vec![],
            default_link_user_state: Some(LinkUserState::ChooseWallet),
        };

        when!(ic_env.caller).then_return(caller);
        when!(link_service.get_action_of_link).then_return(None);
        when!(link_service.link_validate_user_create_action).then_return(Ok(()));
        when!(link_service.link_assemble_intents).then_return(Ok(vec![]));
        when!(tx_manager_service.tx_man_create_action).then_return(Ok(ActionDto {
            id: temp_action.id.clone(),
            r#type: temp_action.r#type.clone().to_string(),
            state: temp_action.state.clone().to_string(),
            creator: temp_action.creator.clone(),
            intents: temp_action
                .intents
                .clone()
                .into_iter()
                .map(|i| i.into())
                .collect(),
            icrc_112_requests: None,
        }));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = ProcessActionAnonymousInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            wallet_address: wallet_address.clone(),
            action_id: temp_action.id.clone(),
        };

        let result = api.process_action_anonymous(input).await;

        assert!(result.is_ok());
        let action = result.unwrap();
        assert_eq!(action.state, ActionState::Created.to_string());
        assert_eq!(action.r#type, ActionType::Use .to_string());
    }

    #[tokio::test]
    async fn should_handle_existing_action_for_anonymous_user() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let mut tx_manager_service = TransactionManagerService::faux();

        let link_id = Uuid::new_v4().to_string();
        let wallet_address = generate_random_principal().to_string();
        let action_type = "Claim".to_string();
        let caller = Principal::anonymous();

        let existing_action = ActionDto {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::Use .to_string(),
            state: ActionState::Processing.to_string(),
            creator: format!("ANON#{}", wallet_address),
            intents: vec![],
            icrc_112_requests: None,
        };

        when!(ic_env.caller).then_return(caller);
        when!(link_service.get_action_of_link).then_return(Some(Action {
            id: existing_action.id.clone(),
            link_id: link_id.clone(),
            r#type: ActionType::Use ,
            state: ActionState::Created,
            creator: existing_action.creator.clone(),
        }));
        when!(link_service.link_validate_user_update_action).then_return(Ok(()));
        when!(tx_manager_service.update_action).then_return(Ok(existing_action.clone()));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = ProcessActionAnonymousInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            wallet_address: wallet_address.clone(),
            action_id: existing_action.id.clone(),
        };

        let result = api.process_action_anonymous(input).await;

        assert!(result.is_ok());
        let action = result.unwrap();
        assert_eq!(action.state, ActionState::Processing.to_string());
        assert_eq!(action.r#type, ActionType::Use .to_string());
    }

    #[tokio::test]
    async fn should_fail_when_caller_is_not_anonymous() {
        let link_service = LinkService::faux();
        let user_service = UserService::faux();
        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();

        let caller = generate_random_principal();
        when!(ic_env.caller).then_return(caller);

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = ProcessActionAnonymousInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "Claim".to_string(),
            wallet_address: generate_random_principal().to_string(),
            action_id: Uuid::new_v4().to_string(),
        };

        let result = api.process_action_anonymous(input).await;

        assert!(result.is_err());
        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn should_fail_when_action_type_is_invalid() {
        let link_service = LinkService::faux();
        let user_service = UserService::faux();
        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();

        let caller = Principal::anonymous();
        when!(ic_env.caller).then_return(caller);

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = ProcessActionAnonymousInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "InvalidActionType".to_string(),
            wallet_address: generate_random_principal().to_string(),
            action_id: Uuid::new_v4().to_string(),
        };

        let result = api.process_action_anonymous(input).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn should_fail_when_action_type_is_not_claim() {
        let link_service = LinkService::faux();
        let user_service = UserService::faux();
        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let tx_manager_service = TransactionManagerService::faux();

        let caller = Principal::anonymous();
        when!(ic_env.caller).then_return(caller);

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let input = ProcessActionAnonymousInput {
            link_id: Uuid::new_v4().to_string(),
            action_type: "Withdraw".to_string(),
            wallet_address: generate_random_principal().to_string(),
            action_id: Uuid::new_v4().to_string(),
        };

        let result = api.process_action_anonymous(input).await;

        assert!(result.is_err());
    }
}
