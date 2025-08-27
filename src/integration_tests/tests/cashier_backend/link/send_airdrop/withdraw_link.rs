use crate::{
    cashier_backend::link::fixture::{LinkTestFixture, create_airdrop_link_fixture},
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
async fn it_should_error_withdraw_link_airdrop_if_caller_anonymous() {
    // Arrange
    let (creator_fixture, link) =
        create_airdrop_link_fixture(constant::ICP_TOKEN, 1_000_000u64, 5).await;

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
async fn it_should_error_withdraw_link_airdrop_if_caller_not_creator() {
    // Arrange
    let (creator_fixture, link) =
        create_airdrop_link_fixture(constant::ICP_TOKEN, 1_000_000u64, 5).await;

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
async fn it_should_withdraw_link_airdrop_successfully() {
    // Arrange
    let (creator_fixture, link) =
        create_airdrop_link_fixture(constant::ICP_TOKEN, 1_000_000u64, 5).await;

    let icp_ledger_client = creator_fixture
        .ctx
        .new_icp_ledger_client(creator_fixture.caller);
    let caller_account = Account {
        owner: creator_fixture.caller,
        subaccount: None,
    };
    let caller_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();

    // Act
    let withdraw_action = creator_fixture
        .create_action(&link.id, constant::WITHDRAW_LINK_ACTION)
        .await;

    // Assert
    assert!(!withdraw_action.id.is_empty());
    assert_eq!(withdraw_action.r#type, ActionType::Withdraw.to_string());
    assert_eq!(withdraw_action.state, ActionState::Created.to_string());
    assert_eq!(withdraw_action.intents.len(), 1);
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

    let link_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    let max_use_count = link.link_use_action_max_count;
    let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

    let caller_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    assert_eq!(
        caller_balance_after,
        caller_balance_before + link_amount * max_use_count + (max_use_count - 1) * icp_ledger_fee,
        "Caller balance after withdrawal is incorrect"
    );
}

#[tokio::test]
async fn it_should_withdraw_link_airdrop_icrc_token_successfully() {
    // Arrange
    let (creator_fixture, link) =
        create_airdrop_link_fixture(constant::CKUSDC_ICRC_TOKEN, 1_000_000u64, 5).await;

    let ckusdc_ledger_client = creator_fixture
        .ctx
        .new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, creator_fixture.caller);
    let caller_account = Account {
        owner: creator_fixture.caller,
        subaccount: None,
    };
    let caller_balance_before = ckusdc_ledger_client
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
    assert_eq!(withdraw_action.intents.len(), 1);
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

    let link_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    let max_use_count = link.link_use_action_max_count;

    let ckusdc_ledger_fee = ckusdc_ledger_client.fee().await.unwrap();

    let caller_balance_after = ckusdc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();

    assert_eq!(
        caller_balance_after,
        caller_balance_before
            + link_amount * max_use_count
            + (max_use_count - 1) * ckusdc_ledger_fee,
        "Caller balance after withdrawal is incorrect"
    );
}
