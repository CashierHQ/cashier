use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::utils::icrc_112::execute_icrc112_request_malformed;
use crate::utils::{
    PocketIcTestContextBuilder, icrc_112::execute_icrc112_request, principal::TestUser,
};
use cashier_backend_types::repository::action::v1::ActionType;
use cashier_backend_types::{
    constant,
    repository::{action::v1::ActionState, intent::v2::IntentState, link::v1::LinkType},
};
use cashier_common::icrc::Icrc114ValidateArgs;
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

#[tokio::test]
async fn it_should_call_icrc_114_validate_success() {
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
    let tip_amount = 1_000_000u64;
    let caller_account = Account {
        owner: caller,
        subaccount: None,
    };

    // Act
    test_fixture.airdrop_icp(initial_balance, &caller).await;

    // Assert
    let caller_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    assert_eq!(caller_balance_before, initial_balance);

    // Act
    let link = test_fixture
        .create_tip_link(constant::ICP_TOKEN, tip_amount)
        .await;

    // Assert
    assert!(!link.id.is_empty());
    assert_eq!(link.link_type, Some(LinkType::SendTip));
    assert_eq!(link.asset_info.len(), 1);
    assert_eq!(link.asset_info[0].amount_per_link_use_action, tip_amount);

    // Act
    let create_action = test_fixture
        .create_action(&link.id, ActionType::CreateLink)
        .await;

    // Assert
    assert!(!create_action.id.is_empty());
    assert_eq!(create_action.r#type, ActionType::CreateLink);
    assert_eq!(create_action.state, ActionState::Created);
    assert_eq!(create_action.intents.len(), 2);
    assert!(
        create_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Created)
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
    assert_eq!(processing_action.intents.len(), 2);
    assert!(
        processing_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Processing)
    );

    // Arrange - execute_icrc112_request and select the "trigger_transaction" action
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
    let icrc112_execution_result = execute_icrc112_request(icrc_112_requests, caller, &ctx)
        .await
        .expect("ICRC112 execution failed");
    let trigger_transaction_response = icrc112_execution_result
        .into_iter()
        .flatten()
        .find(|r| r.method == "trigger_transaction")
        .expect("trigger_transaction response not found");
    let trigger_transaction_result = Icrc114ValidateArgs {
        canister_id: trigger_transaction_response.canister_id,
        method: trigger_transaction_response.method,
        arg: trigger_transaction_response.arg,
        res: trigger_transaction_response.res,
        nonce: trigger_transaction_response.nonce,
    };

    // Act
    let icrc114_response = ctx
        .new_cashier_backend_client(caller)
        .icrc114_validate(trigger_transaction_result)
        .await
        .unwrap();

    // Assert
    assert!(icrc114_response);
}

#[tokio::test]
async fn it_should_return_false_if_validate_icrc_112_response_failed() {
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
    let tip_amount = 1_000_000u64;
    let caller_account = Account {
        owner: caller,
        subaccount: None,
    };

    // Act
    test_fixture.airdrop_icp(initial_balance, &caller).await;

    // Assert
    let caller_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    assert_eq!(caller_balance_before, initial_balance);

    // Act
    let link = test_fixture
        .create_tip_link(constant::ICP_TOKEN, tip_amount)
        .await;

    // Assert
    assert!(!link.id.is_empty());
    assert_eq!(link.link_type, Some(LinkType::SendTip));
    assert_eq!(link.asset_info.len(), 1);
    assert_eq!(link.asset_info[0].amount_per_link_use_action, tip_amount);

    // Act
    let create_action = test_fixture
        .create_action(&link.id, ActionType::CreateLink)
        .await;

    // Assert
    assert!(!create_action.id.is_empty());
    assert_eq!(create_action.r#type, ActionType::CreateLink);
    assert_eq!(create_action.state, ActionState::Created);
    assert_eq!(create_action.intents.len(), 2);
    assert!(
        create_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Created)
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
    assert_eq!(processing_action.intents.len(), 2);
    assert!(
        processing_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Processing)
    );

    // Arrange - execute_icrc112_request and select the "trigger_transaction" action
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
    let icrc112_execution_result =
        execute_icrc112_request_malformed(icrc_112_requests, caller, &ctx)
            .await
            .expect("ICRC112 execution failed");
    let trigger_transaction_response = icrc112_execution_result
        .into_iter()
        .flatten()
        .find(|r| r.method == "trigger_transaction")
        .expect("trigger_transaction response not found");
    let trigger_transaction_result = Icrc114ValidateArgs {
        canister_id: trigger_transaction_response.canister_id,
        method: trigger_transaction_response.method,
        arg: trigger_transaction_response.arg,
        res: trigger_transaction_response.res,
        nonce: trigger_transaction_response.nonce,
    };

    // Act
    let icrc114_response = ctx
        .new_cashier_backend_client(caller)
        .icrc114_validate(trigger_transaction_result)
        .await
        .unwrap();

    // Assert
    assert!(!icrc114_response);
}
