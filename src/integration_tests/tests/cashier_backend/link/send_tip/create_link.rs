use cashier_backend_types::{
    constant::{CREATE_LINK_ACTION, INTENT_LABEL_SEND_TIP_ASSET},
    repository::common::Chain,
    repository::link::v1::{LinkType, Template},
};
use ic_mple_client::CanisterClientError;

use super::super::fixture::LinkTestFixture;
use crate::constant::ICP_PRINCIPAL;
use crate::utils::{PocketIcTestContextBuilder, principal::TestUser, with_pocket_ic_context};
use candid::Principal;
use std::sync::Arc;

#[tokio::test]
async fn should_create_send_tip_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;
        fixture.setup_user().await;
        let tip_link_amount = 100_000_000u64;

        // Act
        let link = fixture.create_tip_link(tip_link_amount).await;

        // Assert
        assert_eq!(link.link_type, Some(LinkType::SendTip.to_string()));
        assert_eq!(link.template, Some(Template::Central.to_string()));
        assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
        assert_eq!(link.asset_info.as_ref().unwrap()[0].address, ICP_PRINCIPAL);
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].chain,
            Chain::IC.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].label,
            INTENT_LABEL_SEND_TIP_ASSET.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
            tip_link_amount
        );
        assert_eq!(link.link_use_action_max_count, 1);
        assert_eq!(link.title, Some("Test Link".to_string()));
        assert!(!link.id.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_create_link_send_tip_if_caller_anonymous() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .build_async()
        .await;
    let be_client = ctx.new_cashier_backend_client(Principal::anonymous());
    let test_fixture = LinkTestFixture::new(Arc::new(ctx), &Principal::anonymous()).await;
    let input = test_fixture.tip_link_input(100_000_000u64);

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
async fn it_should_create_link_send_tip_successfully() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .build_async()
        .await;
    let caller = TestUser::User1.get_principal();
    let mut test_fixture = LinkTestFixture::new(Arc::new(ctx), &caller).await;
    let initial_balance = 1_000_000_000u64;
    let tip_amount = 1_000_000u64;
    test_fixture.airdrop_icp(initial_balance, &caller).await;

    // Act
    let link = test_fixture.create_tip_link(tip_amount).await;

    // Assert
    assert!(link.id.len() > 0);
    assert_eq!(link.link_type, Some(LinkType::SendTip.to_string()));
    assert!(link.asset_info.is_some());
    assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
    assert_eq!(
        link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
        tip_amount
    );

    let create_action = test_fixture
        .create_action(&link.id, CREATE_LINK_ACTION)
        .await;

    // Assert
}
