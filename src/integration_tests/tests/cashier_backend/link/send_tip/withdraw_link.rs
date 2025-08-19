use cashier_backend_types::{
    constant,
    dto::link::UpdateLinkInput,
    repository::{
        action::v1::{ActionState, ActionType},
        intent::v2::IntentState,
        link::v1::LinkState,
    },
};
use icrc_ledger_types::icrc1::account::Account;

use super::super::fixture::LinkTestFixture;
use crate::utils::{PocketIcTestContextBuilder, icrc_112, principal::TestUser};
use std::sync::Arc;

#[tokio::test]
async fn it_should_withdraw_link_send_tip_successfully() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .build_async()
        .await;
    let caller = TestUser::User1.get_principal();
    let mut creator_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;
    let icp_ledger_client = ctx.new_icp_ledger_client(caller);

    let initial_balance = 1_000_000_000u64;
    let tip_amount = 1_000_000u64;

    creator_fixture.airdrop_icp(initial_balance, &caller).await;
    creator_fixture.setup_user().await;

    let link = creator_fixture.create_tip_link(tip_amount).await;
    let create_action = creator_fixture
        .create_action(&link.id, constant::CREATE_LINK_ACTION)
        .await;
    let processing_action = creator_fixture
        .process_action(&link.id, &create_action.id, constant::CREATE_LINK_ACTION)
        .await;
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
    let _icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, caller, &ctx).await;
    let _update_action = creator_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    // Act
    let update_link_input = UpdateLinkInput {
        id: link.id.clone(),
        action: constant::CONTINUE_ACTION.to_string(),
        params: None,
    };
    let update_link = creator_fixture.update_link(update_link_input).await;

    // Assert
    assert_eq!(update_link.state, LinkState::Active.to_string());

    // Arrange
    let caller_account = Account {
        owner: caller,
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

    let caller_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    assert_eq!(
        caller_balance_after,
        caller_balance_before + tip_amount,
        "Caller balance after withdrawal is incorrect"
    );
}
