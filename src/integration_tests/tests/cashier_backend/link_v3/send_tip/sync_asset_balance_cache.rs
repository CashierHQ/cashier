// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::error::CanisterError;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3,
        send_tip::fixture::{activate_tip_link_v3_fixture, create_tip_linkv3_fixture},
    },
    constant::ICP_TOKEN,
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_fail_sync_asset_balance_cache_due_to_invalid_link_state() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: create a link without activating it (state = Created)
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let tip_amount = Nat::from(1_000_000u64);
        let (test_fixture, create_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            ICP_TOKEN,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let link_id = create_result.link.id.clone();

        // Act
        let result = test_fixture.sync_asset_balance_cache_v3(&link_id).await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = result {
            assert!(
                msg.contains("Only active or inactive links"),
                "Unexpected error: {}",
                msg
            );
        } else {
            panic!("Expected CanisterError::ValidationErrors, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_sync_asset_balance_cache_due_to_link_not_found() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let test_fixture = LinkTestFixtureV3::new(ctx.clone().into(), caller, icp_fee).await;

        // Act
        let result = test_fixture
            .sync_asset_balance_cache_v3("non-existent-link-id")
            .await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::NotFound(msg)) = result {
            assert!(msg.contains("Link not found"), "Unexpected error: {}", msg);
        } else {
            panic!("Expected CanisterError::NotFound, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_sync_asset_balance_cache_due_to_unauthorized() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, activate_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let non_creator = TestUser::User2.get_principal();
        let non_creator_fixture =
            LinkTestFixtureV3::new(test_fixture.ctx.clone(), non_creator, icp_fee.clone()).await;
        let cashier_backend_client = non_creator_fixture
            .ctx
            .new_cashier_backend_client(non_creator);

        // Act
        let link_id = activate_result.link.id.clone();
        let result = cashier_backend_client
            .user_sync_asset_balance_cache(&link_id)
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(result.is_err());
        if let Err(CanisterError::Unauthorized(msg)) = result {
            assert!(
                msg.contains("Only the creator can sync asset balance cache"),
                "Unexpected error: {}",
                msg
            );
        } else {
            panic!("Expected CanisterError::Unauthorized, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_sync_asset_balance_cache() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: create and activate a tip link so available_amount is set
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(TestUser::User1.get_principal());
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, activate_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        let link_id = activate_result.link.id.clone();

        // Get the actual ledger balance of the link's subaccount
        let link_account = link_id_to_account(&test_fixture.ctx, &link_id);
        let actual_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();

        // Act
        let result = test_fixture.sync_asset_balance_cache_v3(&link_id).await;

        // Assert
        assert!(
            result.is_ok(),
            "sync_asset_balance_cache_v3 failed: {:?}",
            result
        );
        let response = result.unwrap();
        assert_eq!(response.link.id, link_id);

        let updated_asset = response
            .link
            .asset_info
            .first()
            .expect("link should have at least one asset");
        assert_eq!(
            updated_asset.available_amount,
            Some(actual_balance),
            "available_amount should match the actual ledger balance"
        );

        Ok(())
    })
    .await
    .unwrap();
}
