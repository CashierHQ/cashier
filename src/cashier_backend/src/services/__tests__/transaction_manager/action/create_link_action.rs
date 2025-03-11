mod tests {

    use crate::{
        core::action::types::CreateActionInput,
        services::{
            __tests__::{
                tests::{
                    create_dummy_link, generate_random_principal, generate_timestamp,
                    MockIcEnvironment,
                },
                transaction_manager::action::setup_repositories,
            },
            transaction_manager::{action::ActionService, validate::ValidateService},
        },
        types::error::CanisterError,
    };

    use candid::Principal;
    use cashier_types::UserWallet;
    use faux::when;
    use uuid::Uuid;

    #[tokio::test]
    async fn should_create_link_action_success() {
        let (
            mut action_repository,
            mut intent_repository,
            mut action_intent_repository,
            mut transaction_repository,
            mut intent_transaction_repository,
            mut link_repository,
            mut link_action_repository,
            mut user_action_repository,
            mut user_wallet_repository,
        ) = setup_repositories();

        let mut validate_service = ValidateService::faux();

        let mut ic_env = MockIcEnvironment::faux();

        let link = create_dummy_link();
        let link_id = link.id.clone();

        let caller = generate_random_principal();
        let user_wallet_id = Uuid::new_v4().to_string();

        let input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: "CreateLink".to_string(),
            params: None,
        };

        when!(validate_service.validate_balance_with_asset_info).then_return(Ok(()));
        when!(user_wallet_repository.get(caller.to_text())).then_return(Some(UserWallet {
            user_id: user_wallet_id.clone(),
        }));

        when!(link_repository.get(link_id)).then_return(Some(link));

        when!(action_repository.create).then_return(());
        when!(link_action_repository.create).then_return(());
        when!(user_action_repository.create).then_return(());
        when!(action_intent_repository.batch_create).then_return(());
        when!(intent_repository.batch_create).then_return(());
        when!(intent_transaction_repository.batch_create).then_return(());
        when!(transaction_repository.batch_create).then_return(());

        when!(ic_env.caller).then_return(caller);
        when!(ic_env.time).then_return(generate_timestamp());
        when!(ic_env.id).then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            validate_service,
            ic_env,
        );

        let result = action_service.create_link_action(input).await;

        println!("{:#?}", result);

        assert!(result.is_ok());

        let action_dto = result.unwrap();
        assert_eq!(action_dto.creator, user_wallet_id);
    }

    #[tokio::test]
    async fn should_return_error_if_link_not_found() {
        let (
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            mut link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
        ) = setup_repositories();

        let mut ic_env = MockIcEnvironment::faux();
        let validate_service = ValidateService::faux();

        let link_id = Uuid::new_v4().to_string();
        let input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: "CreateLink".to_string(),
            params: None,
        };
        let caller = generate_random_principal();

        when!(ic_env.caller).then_return(caller);
        when!(ic_env.time).then_return(generate_timestamp());
        when!(ic_env.id).then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());
        when!(link_repository.get).then_return(None);

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            validate_service,
            ic_env,
        );

        let result = action_service.create_link_action(input).await;

        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn should_return_error_if_user_wallet_not_found() {
        let (
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            mut link_repository,
            link_action_repository,
            user_action_repository,
            mut user_wallet_repository,
        ) = setup_repositories();
        let mut ic_env = MockIcEnvironment::faux();
        let mut validate_service = ValidateService::faux();

        let caller = Principal::anonymous();

        let link = create_dummy_link();
        let link_id = link.id.clone();

        let input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: "CreateLink".to_string(),
            params: None,
        };

        when!(link_repository.get(link_id)).then_return(Some(link));
        when!(ic_env.caller).then_return(caller);
        when!(ic_env.time).then_return(generate_timestamp());
        when!(ic_env.id).then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());
        when!(validate_service.validate_balance_with_asset_info).then_return(Ok(()));
        when!(user_wallet_repository.get).then_return(None);

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            validate_service,
            ic_env,
        );

        let result = action_service.create_link_action(input).await;

        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn should_return_error_if_balance_validation_fails() {
        let (
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            mut link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
        ) = setup_repositories();

        let mut validate_service = ValidateService::faux();
        let mut ic_env = MockIcEnvironment::faux();

        let link_id = Uuid::new_v4().to_string();
        let caller = Principal::anonymous();

        let link = create_dummy_link();
        let link_id = link.id.clone();

        let input = CreateActionInput {
            link_id: link_id.clone(),
            action_type: "CreateLink".to_string(),
            params: None,
        };

        when!(link_repository.get(link_id)).then_return(Some(link));
        when!(ic_env.caller).then_return(caller);
        when!(ic_env.time).then_return(generate_timestamp());
        when!(ic_env.id).then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());
        when!(validate_service.validate_balance_with_asset_info)
            .then_return(Err("Insufficient balance".to_string()));

        let action_service = ActionService::new(
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            validate_service,
            ic_env,
        );

        let result = action_service.create_link_action(input).await;

        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }
}
