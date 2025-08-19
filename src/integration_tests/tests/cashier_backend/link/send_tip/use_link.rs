use cashier_backend_types::{
    constant,
    dto::link::UpdateLinkInput,
    repository::{action::v1::ActionState, link::v1::LinkState},
};

use icrc_ledger_types::icrc1::account::Account;

use super::super::fixture::LinkTestFixture;
use crate::utils::{PocketIcTestContextBuilder, icrc_112, principal::TestUser};
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
    let claimer = TestUser::User2.get_principal();
    let claimer_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &claimer).await;
    claimer_fixture.setup_user().await;

    // Act
    let claim_action = claimer_fixture
        .create_action(&link.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert!(!claim_action.id.is_empty());
    assert_eq!(claim_action.r#type, constant::USE_LINK_ACTION);
    assert_eq!(claim_action.state, ActionState::Created.to_string());

    // Act
    let claim_result = claimer_fixture
        .process_action(&link.id, &claim_action.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert_eq!(claim_result.id, claim_action.id);

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
