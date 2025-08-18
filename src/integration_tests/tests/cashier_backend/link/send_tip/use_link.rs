use cashier_backend_types::{
    constant::{self, CONTINUE_ACTION, CREATE_LINK_ACTION},
    dto::{
        action::{CreateActionInput, ProcessActionInput, UpdateActionInput},
        link::UpdateLinkInput,
    },
    repository::{
        action::v1::ActionState,
        intent::v2::IntentState,
        link::v1::{LinkState, LinkType},
    },
};
use cashier_common::utils;
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

use super::super::fixture::LinkTestFixture;
use crate::utils::{
    PocketIcTestContextBuilder, icrc_112::execute_icrc112_request,
    link_id_to_account::link_id_to_account, principal::TestUser,
};
use candid::Principal;
use std::sync::Arc;

#[tokio::test]
async fn it_should_use_link_send_tip_successfully() {
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

    test_fixture.airdrop_icp(initial_balance, &caller).await;

    let user = test_fixture.setup_user().await;

    let link = test_fixture.create_tip_link(tip_amount).await;

    let create_action = test_fixture
        .create_action(&link.id, CREATE_LINK_ACTION)
        .await;
    let processing_action = test_fixture
        .process_action(&link.id, &create_action.id)
        .await;

    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

    let icrc112_execution_result = execute_icrc112_request(icrc_112_requests, caller, &ctx).await;

    let update_action = test_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    // Act
    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: CONTINUE_ACTION.to_string(),
        params: None,
    };
    let update_link = test_fixture.update_link(update_link_input).await;

    // Assert
    assert_eq!(update_link.state, LinkState::Active.to_string());

    // Act
    let claimer = TestUser::User2.get_principal();
    let cashier_backend_client = ctx.new_cashier_backend_client(claimer);
    let claimer_user = cashier_backend_client.create_user().await.unwrap().unwrap();
    assert!(!claimer_user.id.is_empty());

    let create_action_input = CreateActionInput {
        link_id: link.id.to_string(),
        action_type: constant::USE_LINK_ACTION.to_string(),
    };
    let claim_action = cashier_backend_client
        .create_action(create_action_input)
        .await
        .unwrap()
        .unwrap();

    let process_action_input = ProcessActionInput {
        action_id: claim_action.id.to_string(),
        action_type: constant::USE_LINK_ACTION.to_string(),
        link_id: link.id.to_string(),
    };
    let claim_result = cashier_backend_client
        .process_action(process_action_input)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(claim_result.id, claim_action.id);

    // Assert balance
    let claimer_account = Account {
        owner: claimer,
        subaccount: None,
    };
    let claimer_balance = icp_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    assert_eq!(
        claimer_balance, tip_amount,
        "Claimer balance should be equal to tip amount"
    );
}
