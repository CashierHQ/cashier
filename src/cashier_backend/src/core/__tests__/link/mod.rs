#[cfg(test)]
pub mod link_update_user_state;

#[cfg(test)]
pub mod link_get_user_state;

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use candid::Principal;
    use cashier_types::{Action, ActionState, ActionType};
    use faux::when;
    use uuid::Uuid;

    use crate::{
        core::{
            action::types::{ActionDto, ProcessActionInput},
            link::api::LinkApi,
        },
        info,
        services::{
            __tests__::tests::MockIcEnvironment,
            link::v2::LinkService,
            transaction_manager::{action::ActionService, TransactionManagerService},
            user::v2::UserService,
        },
        types::{error::CanisterError, temp_action::TemporaryAction},
    };

    #[tokio::test]
    async fn should_process_action_with_valid_user_and_create_link_action() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut tx_manager_service = TransactionManagerService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let action_service = ActionService::faux();

        let link_id = Uuid::new_v4().to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_type = "CreateLink".to_string();
        let caller = Principal::anonymous();

        let action_id = Uuid::new_v4().to_string();

        let input = ProcessActionInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            action_id: action_id.clone(),
        };

        let action_type_enum = ActionType::from_str(&action_type).unwrap();

        let temp_action = TemporaryAction {
            id: action_id,
            r#type: action_type_enum.clone(),
            state: ActionState::Created,
            creator: user_id.clone(),
            link_id: link_id.clone(),
            intents: vec![],
            default_link_user_state: None,
        };

        when!(ic_env.caller).then_return(caller.clone());
        when!(user_service.get_user_id_by_wallet).then_return(Some(user_id.clone()));
        when!(link_service.get_action_of_link).then_return(None);
        when!(link_service.link_validate_user_create_action).then_return(Ok(()));
        when!(link_service.link_assemble_intents).then_return(Ok(vec![]));
        when!(tx_manager_service.tx_man_create_action).then_return(Ok(ActionDto {
            id: temp_action.id.clone(),
            r#type: action_type_enum.to_string(),
            state: ActionState::Created.to_string(),
            creator: user_id.clone(),
            intents: vec![],
            icrc_112_requests: None,
        }));
        when!(link_service.link_validate_balance_with_asset_info).then_return(Ok(()));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let result = api.process_action(input).await;

        assert!(result.is_ok());

        let action_dto = result.unwrap();
        assert_eq!(action_dto.state, ActionState::Created.to_string());
    }

    #[tokio::test]
    async fn should_process_action_with_existing_action() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut tx_manager_service = TransactionManagerService::faux();
        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let link_id = Uuid::new_v4().to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_id = Uuid::new_v4().to_string();
        let action_type = "CreateLink".to_string();
        let caller = Principal::anonymous();

        let input = ProcessActionInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            action_id: action_id.clone(),
        };

        let action = Action {
            id: action_id.clone(),
            r#type: ActionType::from_str(&action_type).unwrap(),
            state: ActionState::Created,
            creator: user_id.clone(),
            link_id: link_id.clone(),
        };

        when!(ic_env.caller).then_return(caller.clone());
        when!(user_service.get_user_id_by_wallet).then_return(Some(user_id.clone()));
        when!(link_service.get_action_of_link).then_return(Some(action.clone()));
        when!(link_service.link_validate_user_update_action).then_return(Ok(()));
        when!(tx_manager_service.update_action).then_return(Ok(ActionDto {
            id: action_id.clone(),
            r#type: action_type.clone(),
            state: ActionState::Processing.to_string(),
            creator: user_id.clone(),
            intents: vec![],
            icrc_112_requests: None,
        }));
        when!(link_service.link_validate_balance_with_asset_info).then_return(Ok(()));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let result = api.process_action(input).await;

        assert!(result.is_ok());

        let action_dto = result.unwrap();
        assert_eq!(action_dto.state, ActionState::Processing.to_string());
    }

    #[tokio::test]
    async fn should_return_error_if_user_not_found() {
        let link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let action_service = ActionService::faux();

        let link_id = Uuid::new_v4().to_string();
        let action_type = "CreateLink".to_string();
        let caller = Principal::anonymous();
        let action_id = Uuid::new_v4().to_string();

        let input = ProcessActionInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            action_id: action_id.clone(),
        };

        when!(ic_env.caller).then_return(caller.clone());
        when!(user_service.get_user_id_by_wallet).then_return(None);

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let result = api.process_action(input).await;

        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn should_return_error_if_invalid_action_type() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let mut ic_env = MockIcEnvironment::faux();
        let action_service = ActionService::faux();

        let link_id = Uuid::new_v4().to_string();
        let action_type = "dummy".to_string();
        let caller = Principal::anonymous();
        let action_id = Uuid::new_v4().to_string();

        let input = ProcessActionInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            action_id: action_id.clone(),
        };

        when!(ic_env.caller).then_return(caller.clone());
        when!(user_service.get_user_id_by_wallet).then_return(Some(Uuid::new_v4().to_string()));
        when!(link_service.get_action_of_link).then_return(None);

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );

        let result = api.process_action(input).await;

        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn should_return_error_if_failed_to_assemble_intents() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let tx_manager_service = TransactionManagerService::faux();
        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let link_id = Uuid::new_v4().to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_type = "CreateLink".to_string();
        let caller = Principal::anonymous();
        let action_id = Uuid::new_v4().to_string();

        let input = ProcessActionInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            action_id: action_id.clone(),
        };

        when!(ic_env.caller).then_return(caller.clone());
        when!(user_service.get_user_id_by_wallet).then_return(Some(user_id.clone()));
        when!(link_service.get_action_of_link).then_return(None);
        when!(link_service.link_validate_user_create_action).then_return(Ok(()));
        when!(link_service.link_assemble_intents).then_return(Err(
            CanisterError::HandleLogicError("Failed to assemble intents".to_string()),
        ));
        when!(link_service.link_validate_balance_with_asset_info).then_return(Ok(()));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );
        let result = api.process_action(input).await;

        assert!(matches!(result, Err(CanisterError::HandleLogicError(_))));
    }

    #[tokio::test]
    async fn should_return_error_if_not_enough_balance() {
        let mut link_service = LinkService::faux();
        let mut user_service = UserService::faux();
        let mut tx_manager_service = TransactionManagerService::faux();
        let action_service = ActionService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let link_id = Uuid::new_v4().to_string();
        let user_id = Uuid::new_v4().to_string();
        let action_type = "CreateLink".to_string();
        let caller = Principal::anonymous();
        let action_id = Uuid::new_v4().to_string();

        let input = ProcessActionInput {
            link_id: link_id.clone(),
            action_type: action_type.clone(),
            action_id: action_id.clone(),
        };

        let action = Action {
            id: action_id.clone(),
            r#type: ActionType::from_str(&action_type).unwrap(),
            state: ActionState::Created,
            creator: user_id.clone(),
            link_id: link_id.clone(),
        };

        when!(ic_env.caller).then_return(caller.clone());
        when!(user_service.get_user_id_by_wallet).then_return(Some(user_id.clone()));
        when!(link_service.get_action_of_link).then_return(Some(action.clone()));
        when!(link_service.link_validate_user_update_action).then_return(Ok(()));
        when!(tx_manager_service.update_action).then_return(Ok(ActionDto {
            id: action_id.clone(),
            r#type: action_type.clone(),
            state: ActionState::Processing.to_string(),
            creator: user_id.clone(),
            intents: vec![],
            icrc_112_requests: None,
        }));

        when!(link_service.link_validate_user_update_action).then_return(Err(
            CanisterError::ValidationErrors("Failed to validate balance".to_string()),
        ));

        let api = LinkApi::new(
            link_service,
            user_service,
            tx_manager_service,
            action_service,
            ic_env,
        );
        let result = api.process_action(input).await;

        info!("{:?}", result);

        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }
}
