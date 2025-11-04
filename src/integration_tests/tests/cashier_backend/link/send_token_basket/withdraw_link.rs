use crate::{
    cashier_backend::link::fixture::{LinkTestFixture, create_token_basket_link_fixture},
    utils::{principal::TestUser, with_pocket_ic_context},
};
use candid::Principal;
use cashier_backend_types::{
    constant,
    dto::action::CreateActionInput,
    error::CanisterError,
    repository::{
        action::v1::{ActionState, ActionType},
        intent::v1::IntentState,
    },
};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_error_withdraw_link_token_basket_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) = create_token_basket_link_fixture(ctx).await;

        let caller = Principal::anonymous();
        let caller_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let result = cashier_backend_client
            .user_create_action(CreateActionInput {
                link_id: link.id.clone(),
                action_type: ActionType::Withdraw,
            })
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterClientError::PocketIcTestError(err)) = result {
            assert!(err.reject_message.contains("AnonimousUserNotAllowed"));
        } else {
            panic!("Expected PocketIcTestError, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_withdraw_link_token_basket_if_caller_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) = create_token_basket_link_fixture(ctx).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let result = cashier_backend_client
            .user_create_action(CreateActionInput {
                link_id: link.id.clone(),
                action_type: ActionType::Withdraw,
            })
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::ValidationErrors(err)) = result {
            assert!(err.contains("User is not the creator of the link"));
        } else {
            panic!("Expected PocketIcTestError, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_withdraw_link_token_basket_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) = create_token_basket_link_fixture(ctx).await;
        let icp_ledger_client = creator_fixture
            .ctx
            .new_icp_ledger_client(creator_fixture.caller);
        let ckbtc_ledger_client = creator_fixture
            .ctx
            .new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, creator_fixture.caller);

        let ckusdc_ledger_client = creator_fixture
            .ctx
            .new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, creator_fixture.caller);

        let caller_account = Account {
            owner: creator_fixture.caller,
            subaccount: None,
        };

        let icp_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        let ckusdc_balance_before = ckusdc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        // Act
        let withdraw_action = creator_fixture
            .create_action(&link.id, ActionType::Withdraw)
            .await;

        // Assert
        assert!(!withdraw_action.id.is_empty());
        assert_eq!(withdraw_action.r#type, ActionType::Withdraw);
        assert_eq!(withdraw_action.state, ActionState::Created);
        assert_eq!(withdraw_action.intents.len(), 3);
        assert!(
            withdraw_action
                .intents
                .iter()
                .all(|intent| { intent.state == IntentState::Created }),
        );

        // Act
        let withdraw_result = creator_fixture
            .process_action(&link.id, &withdraw_action.id, ActionType::Withdraw)
            .await;

        // Assert
        assert_eq!(withdraw_result.id, withdraw_action.id);
        assert_eq!(withdraw_result.r#type, ActionType::Withdraw);
        assert_eq!(withdraw_result.state, ActionState::Success);
        assert!(
            withdraw_result
                .intents
                .iter()
                .all(|intent| intent.state == IntentState::Success)
        );

        let icp_link_amount = link.asset_info[0].amount_per_link_use_action.clone();
        let ckbtc_link_amount = link.asset_info[1].amount_per_link_use_action.clone();
        let ckusdc_link_amount = link.asset_info[2].amount_per_link_use_action.clone();

        let icp_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_balance_after = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        let ckusdc_balance_after = ckusdc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        assert_eq!(
            icp_balance_after,
            icp_balance_before + icp_link_amount,
            "ICP balance after withdrawal is incorrect"
        );
        assert_eq!(
            ckbtc_balance_after,
            ckbtc_balance_before + ckbtc_link_amount,
            "CKBTC balance after withdrawal is incorrect"
        );
        assert_eq!(
            ckusdc_balance_after,
            ckusdc_balance_before + ckusdc_link_amount,
            "CKUSDC balance after withdrawal is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_withdraw_link_token_basket() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) = create_token_basket_link_fixture(ctx).await;
        let be_cycles_before = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;

        // Act
        let withdraw_action = creator_fixture
            .create_action(&link.id, ActionType::Withdraw)
            .await;
        let _withdraw_result = creator_fixture
            .process_action(&link.id, &withdraw_action.id, ActionType::Withdraw)
            .await;

        // Assert
        let be_cycles_after = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!("BE cycles usage withdraw token basket: {}", cycles_usage);

        Ok(())
    })
    .await
    .unwrap();
}
