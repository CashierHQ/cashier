use cashier_backend_types::constant::INTENT_LABEL_SEND_TIP_ASSET;
use cashier_backend_types::repository::common::Chain;
use cashier_backend_types::repository::link::v1::{LinkType, Template};
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
        let fixture = LinkTestFixture::new(ctx, &caller).await;
        fixture.setup_user().await;
        let tip_link_amount = 100_000_000u64;

        // Act
        let link = fixture.create_tip_link(ctx, tip_link_amount).await;

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
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .build_async()
        .await;
    let be_client = ctx.new_cashier_backend_client(Principal::anonymous());
    let test_fixture = LinkTestFixture::new(&ctx, &Principal::anonymous()).await;
    let input = test_fixture.tip_link_input(100_000_000u64);
    let result = be_client.create_link(input).await;

    assert!(result.is_err());

    if let Err(CanisterClientError::PocketIcTestError(err)) = result {
        assert!(
            err.reject_message
                .contains("Anonymous caller is not allowed")
        );
    } else {
        panic!("Expected an error but got a successful response");
    }
}
