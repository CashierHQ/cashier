// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3,
        send_tip::fixture::{activate_tip_link_v3_fixture, create_tip_linkv3_fixture},
    },
    constant::ICP_TOKEN,
    utils::{principal::TestUser, with_pocket_ic_context},
};
use candid::Nat;
use cashier_backend_types::error::CanisterError;
use cashier_shared::types::LinkState as LinkStateShared;

#[tokio::test]
async fn it_should_fail_disable_icp_token_tip_link_if_link_not_active() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v3(&link_id).await;
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
async fn it_should_fail_disable_icp_token_tip_link_if_caller_is_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture =
            LinkTestFixtureV3::new(test_fixture.ctx.clone(), caller, icp_fee.clone()).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = cashier_backend_client.user_disable_link_v3(&link_id).await;

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
async fn it_should_succeed_disable_icp_token_tip_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v3(&link_id).await;
        // Assert
        assert!(disable_link_result.is_ok());
        let result = disable_link_result.unwrap();
        assert_eq!(result.link.link_state, LinkStateShared::Inactive);

        Ok(())
    })
    .await
    .unwrap();
}
