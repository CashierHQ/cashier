use crate::{
    cashier_backend::link::fixture::{LinkTestFixture, create_token_basket_link_fixture},
    utils::principal::TestUser,
};
use candid::Principal;
use cashier_backend_types::{
    constant,
    dto::action::CreateActionInput,
    error::CanisterError,
    repository::{
        action::v1::{ActionState, ActionType},
        intent::v2::IntentState,
    },
};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_error_withdraw_link_token_basket_if_caller_anonymous() {
    // Arrange
    let (creator_fixture, link) = create_token_basket_link_fixture().await;

    let caller = Principal::anonymous();
    let caller_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &caller).await;
    let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

    // Act
    let result = cashier_backend_client
        .create_action(CreateActionInput {
            link_id: link.id.clone(),
            action_type: constant::WITHDRAW_LINK_ACTION.to_string(),
        })
        .await;

    // Assert
    assert!(result.is_err());
    if let Err(CanisterClientError::PocketIcTestError(err)) = result {
        assert!(
            err.reject_message
                .contains("Anonymous caller is not allowed")
        );
    } else {
        panic!("Expected PocketIcTestError, got {:?}", result);
    }
}

#[tokio::test]
async fn it_should_error_withdraw_link_token_basket_if_caller_not_creator() {
    // Arrange
    let (creator_fixture, link) = create_token_basket_link_fixture().await;

    let caller = TestUser::User2.get_principal();
    let caller_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &caller).await;
    let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

    // Act
    let result = cashier_backend_client
        .create_action(CreateActionInput {
            link_id: link.id.clone(),
            action_type: constant::WITHDRAW_LINK_ACTION.to_string(),
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
}

#[tokio::test]
async fn it_should_withdraw_link_token_basket_successfully() {
    // Arrange
    let (creator_fixture, link) = create_token_basket_link_fixture().await;
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
        .create_action(&link.id, constant::WITHDRAW_LINK_ACTION)
        .await;

    // Assert
    assert!(!withdraw_action.id.is_empty());
    assert_eq!(withdraw_action.r#type, ActionType::Withdraw.to_string());
    assert_eq!(withdraw_action.state, ActionState::Created.to_string());
    assert_eq!(withdraw_action.intents.len(), 3);
    assert!(
        withdraw_action
            .intents
            .iter()
            .all(|intent| { intent.state == IntentState::Created.to_string() }),
    );

    // Act
    let withdraw_result = creator_fixture
        .process_action(
            &link.id,
            &withdraw_action.id,
            constant::WITHDRAW_LINK_ACTION,
        )
        .await;

    // Assert
    assert_eq!(withdraw_result.id, withdraw_action.id);
    assert_eq!(withdraw_result.r#type, ActionType::Withdraw.to_string());
    assert_eq!(withdraw_result.state, ActionState::Success.to_string());
    assert!(
        withdraw_result
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Success.to_string())
    );

    let icp_link_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    let ckbtc_link_amount = link.asset_info.as_ref().unwrap()[1].amount_per_link_use_action;
    let ckusdc_link_amount = link.asset_info.as_ref().unwrap()[2].amount_per_link_use_action;

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
}
