use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::utils::{
    PocketIcTestContextBuilder, icrc_112::execute_icrc112_request,
    link_id_to_account::link_id_to_account, principal::TestUser,
};
use candid::Principal;
use cashier_backend_types::dto::link::LinkStateMachineGoto;
use cashier_backend_types::repository::action::v1::ActionType;
use cashier_backend_types::{
    constant,
    dto::link::UpdateLinkInput,
    repository::{
        action::v1::ActionState,
        intent::v2::IntentState,
        link::v1::{LinkState, LinkType},
    },
};
use cashier_common::test_utils;
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

#[tokio::test]
async fn it_should_error_create_link_payment_if_caller_anonymous() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .build_async()
        .await;
    let be_client = ctx.new_cashier_backend_client(Principal::anonymous());
    let test_fixture = LinkTestFixture::new(Arc::new(ctx), &Principal::anonymous()).await;

    let link_amount = 1_000_000u64;
    let link_input = test_fixture
        .receive_payment_link_input(vec![constant::ICP_TOKEN.to_string()], vec![link_amount])
        .unwrap();

    // Act
    let result = be_client.create_link(link_input).await;

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
async fn it_should_create_link_payment_icp_token_successfully() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .build_async()
        .await;
    let caller = TestUser::User1.get_principal();
    let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;
    let icp_ledger_client = ctx.new_icp_ledger_client(caller);

    let initial_balance = 1_000_000_000u64;
    let link_amount = 1_000_000u64;

    let caller_account = Account {
        owner: caller,
        subaccount: None,
    };

    // Act
    test_fixture.airdrop_icp(initial_balance, &caller).await;

    // Assert
    let caller_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    assert_eq!(caller_balance_before, initial_balance);

    // Arrange
    let link_input = test_fixture
        .receive_payment_link_input(vec![constant::ICP_TOKEN.to_string()], vec![link_amount])
        .unwrap();

    // Act
    let link = test_fixture.create_link(link_input).await;

    // Assert
    assert!(!link.id.is_empty());
    assert_eq!(link.link_type, Some(LinkType::ReceivePayment));
    assert!(link.asset_info.is_some());
    assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
    assert_eq!(
        link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
        link_amount
    );

    // Act
    let create_action = test_fixture
        .create_action(&link.id, ActionType::CreateLink)
        .await;

    // Assert
    assert!(!create_action.id.is_empty());
    assert_eq!(create_action.r#type, ActionType::CreateLink);
    assert_eq!(create_action.state, ActionState::Created);
    assert_eq!(create_action.intents.len(), 1);
    assert!(
        create_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Created.to_string())
    );

    // Act
    let processing_action = test_fixture
        .process_action(&link.id, &create_action.id, ActionType::CreateLink)
        .await;

    // Assert
    assert!(!processing_action.id.is_empty());
    assert_eq!(processing_action.r#type, ActionType::CreateLink);
    assert_eq!(processing_action.state, ActionState::Processing);
    assert!(processing_action.icrc_112_requests.is_some());
    assert_eq!(
        processing_action.icrc_112_requests.as_ref().unwrap().len(),
        2
    );
    assert_eq!(processing_action.intents.len(), 1);
    assert!(
        processing_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Processing.to_string())
    );

    // Arrange
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

    // Act
    let icrc112_execution_result = execute_icrc112_request(icrc_112_requests, caller, &ctx).await;

    // Assert
    assert!(icrc112_execution_result.is_ok());

    // Act
    let update_action = test_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    // Assert
    assert!(!update_action.id.is_empty());
    assert_eq!(update_action.r#type, ActionType::CreateLink);
    assert_eq!(update_action.state, ActionState::Success);
    assert!(
        update_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Success.to_string())
    );

    // Act
    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: LinkStateMachineGoto::Continue,
        params: None,
    };
    let update_link = test_fixture.update_link(update_link_input).await;

    // Assert
    assert_eq!(update_link.state, LinkState::Active);

    let link_account = link_id_to_account(&ctx, &link.id);
    let caller_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
    let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

    assert_eq!(link_balance, 0u64, "Link balance is zero after creation");
    assert_eq!(
        caller_balance_after,
        initial_balance - test_utils::calculate_amount_for_create_link(&icp_ledger_fee),
        "Caller balance after creation is incorrect"
    );
}

#[tokio::test]
async fn it_should_create_link_payment_icrc_token_successfully() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .with_icrc_tokens(vec![constant::CKUSDC_ICRC_TOKEN.to_string()])
        .build_async()
        .await;
    let caller = TestUser::User1.get_principal();
    let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

    let icp_ledger_client = ctx.new_icp_ledger_client(caller);
    let icrc_ledger_client = ctx.new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, caller);

    let initial_balance = 1_000_000_000u64;
    let link_amount = 1_000_000u64;

    let caller_account = Account {
        owner: caller,
        subaccount: None,
    };

    // Act
    test_fixture.airdrop_icp(initial_balance, &caller).await;

    // Assert
    let icp_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    assert_eq!(icp_balance_before, initial_balance);

    // Arrange
    let link_input = test_fixture
        .receive_payment_link_input(
            vec![constant::CKUSDC_ICRC_TOKEN.to_string()],
            vec![link_amount],
        )
        .unwrap();

    // Act
    let link = test_fixture.create_link(link_input).await;

    // Assert
    assert!(!link.id.is_empty());
    assert_eq!(link.link_type, Some(LinkType::ReceivePayment));
    assert!(link.asset_info.is_some());
    assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
    assert_eq!(
        link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
        link_amount
    );

    // Act
    let create_action = test_fixture
        .create_action(&link.id, ActionType::CreateLink)
        .await;

    // Assert
    assert!(!create_action.id.is_empty());
    assert_eq!(create_action.r#type, ActionType::CreateLink);
    assert_eq!(create_action.state, ActionState::Created);
    assert_eq!(create_action.intents.len(), 1);
    assert!(
        create_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Created.to_string())
    );

    // Act
    let processing_action = test_fixture
        .process_action(&link.id, &create_action.id, ActionType::CreateLink)
        .await;

    // Assert
    assert!(!processing_action.id.is_empty());
    assert_eq!(processing_action.r#type, ActionType::CreateLink);
    assert_eq!(processing_action.state, ActionState::Processing);
    assert!(processing_action.icrc_112_requests.is_some());
    assert_eq!(
        processing_action.icrc_112_requests.as_ref().unwrap().len(),
        2
    );
    assert_eq!(processing_action.intents.len(), 1);
    assert!(
        processing_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Processing.to_string())
    );

    // Arrange
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

    // Act
    let icrc112_execution_result = execute_icrc112_request(icrc_112_requests, caller, &ctx).await;

    // Assert
    assert!(icrc112_execution_result.is_ok());

    // Act
    let update_action = test_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    // Assert
    assert!(!update_action.id.is_empty());
    assert_eq!(update_action.r#type, ActionType::CreateLink);
    assert_eq!(update_action.state, ActionState::Success);
    assert!(
        update_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Success.to_string())
    );

    // Act
    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: LinkStateMachineGoto::Continue,
        params: None,
    };
    let update_link = test_fixture.update_link(update_link_input).await;

    // Assert
    assert_eq!(update_link.state, LinkState::Active);

    let link_account = link_id_to_account(&ctx, &link.id);
    let icp_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    let link_balance = icrc_ledger_client.balance_of(&link_account).await.unwrap();
    let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

    assert_eq!(link_balance, 0u64, "Link balance is zero after creation");
    assert_eq!(
        icp_balance_after,
        icp_balance_before - test_utils::calculate_amount_for_create_link(&icp_ledger_fee),
        "Caller balance after creation is incorrect"
    );
}
