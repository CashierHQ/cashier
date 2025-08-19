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

use super::super::fixture::LinkTestFixture;
use crate::utils::{
    PocketIcTestContextBuilder, icrc_112::execute_icrc112_request,
    link_id_to_account::link_id_to_account, principal::TestUser,
};
use candid::Principal;
use std::sync::Arc;

#[tokio::test]
async fn it_should_create_link_airdrop_successfully() {
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
    let airdrop_amount = 1_000_000u64;
    let max_use_count = 5;

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

    // Arrange
    let link_input = test_fixture
        .airdrop_link_input(
            vec![constant::ICP_TOKEN.to_string()],
            vec![airdrop_amount],
            max_use_count,
        )
        .unwrap();

    // Act
    let link = test_fixture.create_link(link_input).await;

    // Assert
    assert!(!link.id.is_empty());
    assert_eq!(link.link_type, Some(LinkType::SendAirdrop.to_string()));
    assert!(link.asset_info.is_some());
    assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
    assert_eq!(
        link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
        airdrop_amount
    );
}
