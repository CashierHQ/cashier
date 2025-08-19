use super::super::fixture::LinkTestFixture;
use crate::utils::{
    PocketIcTestContextBuilder, icrc_112::execute_icrc112_request,
    link_id_to_account::link_id_to_account, principal::TestUser,
};
use candid::Principal;
use cashier_backend_types::{
    constant,
    dto::link::UpdateLinkInput,
    repository::{
        action::v1::ActionState,
        intent::v2::IntentState,
        link::v1::{LinkState, LinkType},
    },
};
use cashier_common::utils;
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

#[tokio::test]
async fn it_should_error_create_link_tip_if_caller_anonymous() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .build_async()
        .await;
    let be_client = ctx.new_cashier_backend_client(Principal::anonymous());
    let test_fixture = LinkTestFixture::new(Arc::new(ctx), &Principal::anonymous()).await;
    let input = test_fixture
        .tip_link_input(vec![constant::ICP_TOKEN.to_string()], vec![1_000_000u64])
        .unwrap();

    // Act
    let result = be_client.create_link(input).await;

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
async fn it_should_create_link_tip_successfully() {
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
    let user = test_fixture.setup_user().await;

    // Assert
    assert!(!user.id.is_empty());

    // Act
    let link = test_fixture.create_tip_link(tip_amount).await;

    // Assert
    assert!(!link.id.is_empty());
    assert_eq!(link.link_type, Some(LinkType::SendTip.to_string()));
    assert!(link.asset_info.is_some());
    assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
    assert_eq!(
        link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
        tip_amount
    );

    // Act
    let create_action = test_fixture
        .create_action(&link.id, constant::CREATE_LINK_ACTION)
        .await;

    // Assert
    assert!(!create_action.id.is_empty());
    assert_eq!(create_action.r#type, constant::CREATE_LINK_ACTION);
    assert_eq!(create_action.state, ActionState::Created.to_string());
    assert_eq!(create_action.intents.len(), 2);
    assert!(
        create_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Created.to_string())
    );

    // Act
    let processing_action = test_fixture
        .process_action(&link.id, &create_action.id, constant::CREATE_LINK_ACTION)
        .await;

    // Assert
    assert!(!processing_action.id.is_empty());
    assert_eq!(processing_action.r#type, constant::CREATE_LINK_ACTION);
    assert_eq!(processing_action.state, ActionState::Processing.to_string());
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
    assert_eq!(update_action.r#type, constant::CREATE_LINK_ACTION);
    assert_eq!(update_action.state, ActionState::Success.to_string());
    assert!(
        update_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Success.to_string())
    );

    // Assert the balance
    let link_account = link_id_to_account(&ctx, &link.id);
    let caller_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
    let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
    assert_eq!(
        link_balance,
        tip_amount + icp_ledger_fee.clone(),
        "Link balance should be equal to the tip amount plus the ICP ledger fee"
    );
    assert_eq!(
        caller_balance_after,
        initial_balance
            - tip_amount
            - utils::calculate_create_link_fee(constant::ICP_TOKEN, &icp_ledger_fee, 1),
        "Caller balance should be reduced by the tip amount plus the ICP ledger fee"
    );

    // Act
    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: constant::CONTINUE_ACTION.to_string(),
        params: None,
    };
    let update_link = test_fixture.update_link(update_link_input).await;

    // Assert
    assert_eq!(update_link.state, LinkState::Active.to_string());
}
