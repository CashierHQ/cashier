// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link::fixture::{
    LinkTestFixture, activate_tip_link_v2_fixture, create_tip_linkv2_fixture,
};
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use cashier_backend_types::constant::ICP_TOKEN;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::link::v1::LinkState;

#[tokio::test]
async fn it_should_fail_disable_icp_token_tip_linkv2_if_link_not_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v2(&link_id).await;

        // Assert
        assert!(disable_link_result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = disable_link_result {
            assert!(
                msg.contains("Only active links can be disabled"),
                "Unexpected error message: {}",
                msg
            );
        } else {
            panic!(
                "Expected CanisterError::ValidationErrors, got {:?}",
                disable_link_result
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_disable_icp_token_tip_linkv2_if_caller_is_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, tip_amount).await;
        let caller = TestUser::User2.get_principal();
        let caller_fixture = LinkTestFixture::new(test_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = cashier_backend_client.user_disable_link_v2(&link_id).await;

        // Assert
        assert!(disable_link_result.is_ok());
        let disable_link_result = disable_link_result.unwrap();
        assert!(disable_link_result.is_err());

        if let Err(err) = disable_link_result {
            match err {
                CanisterError::Unauthorized(err) => {
                    assert_eq!(err, "Only the creator can disable the link");
                }
                _ => {
                    panic!("Expected UnauthorizedError, got different error: {:?}", err);
                }
            }
        } else {
            panic!("Expected error, got success");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_disable_icp_token_tip_linkv2() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v2(&link_id).await;

        // Assert
        assert!(disable_link_result.is_ok());
        let link_dto = disable_link_result.unwrap();
        assert_eq!(link_dto.state, LinkState::Inactive);

        Ok(())
    })
    .await
    .unwrap();
}
