// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::time::Duration;

use cashier_backend_types::{backoff::BackoffConfig, error::CanisterError};
use gate_service_types::GateKey;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, password_gate::fixture::activated_password_gate_link_fixture,
    },
    utils::{principal::TestUser, with_pocket_ic_context},
};

async fn disable_inspect_message(ctx: &crate::utils::PocketIcTestContext) {
    let admin = TestUser::CashierBackendAdmin.get_principal();
    ctx.new_cashier_backend_client(admin)
        .admin_inspect_message_enable(false)
        .await
        .unwrap()
        .unwrap();
}

#[tokio::test]
async fn it_should_fail_retry_immediately_after_wrong_password() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "correct").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // First attempt with wrong password — records a failure
        let _ = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;

        // Act — immediate retry (within backoff window)
        let result = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;

        // Assert
        assert!(
            matches!(result, Err(CanisterError::BackoffThrottled(_))),
            "expected BackoffThrottled on immediate retry, got {result:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_retry_after_admin_resets_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "correct").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Trigger backoff
        let _ = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;
        let blocked = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;
        assert!(matches!(blocked, Err(CanisterError::BackoffThrottled(_))));

        // Admin resets
        admin_client
            .admin_gate_backoff_reset_user(receiver)
            .await
            .unwrap()
            .unwrap();

        // Act — retry with wrong password (backoff reset, rate limit also reset for clean test)
        admin_client
            .admin_gate_rate_limit_reset_user(receiver)
            .await
            .unwrap()
            .unwrap();

        let result = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;

        // Assert — backoff cleared, so we get Unauthorized (wrong password) not BackoffThrottled
        assert!(
            !matches!(result, Err(CanisterError::BackoffThrottled(_))),
            "expected no BackoffThrottled after reset, got {result:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_retry_after_admin_sets_short_base_wait() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        // Set a 1-second base wait so we can advance time in the test
        admin_client
            .admin_gate_backoff_update(BackoffConfig {
                enabled: true,
                base_wait_secs: 1,
            })
            .await
            .unwrap()
            .unwrap();

        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "correct").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Trigger backoff (1-second wait)
        let _ = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;

        // Verify blocked
        let blocked = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;
        assert!(matches!(blocked, Err(CanisterError::BackoffThrottled(_))));

        // Advance past the 1-second backoff
        ctx.advance_time(Duration::from_secs(2)).await;

        // Also reset the rate limit so only backoff is the constraint
        admin_client
            .admin_gate_rate_limit_reset_user(receiver)
            .await
            .unwrap()
            .unwrap();

        // Act — retry after backoff expired
        let result = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;

        // Assert — not BackoffThrottled (either Unauthorized or RateLimited, not BackoffThrottled)
        assert!(
            !matches!(result, Err(CanisterError::BackoffThrottled(_))),
            "expected no BackoffThrottled after wait, got {result:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_retry_after_correct_password_resets_backoff() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        // Use short base wait so we can expire it
        admin_client
            .admin_gate_backoff_update(BackoffConfig {
                enabled: true,
                base_wait_secs: 1,
            })
            .await
            .unwrap()
            .unwrap();

        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "correct").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Trigger backoff with wrong password
        let _ = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;
        assert!(matches!(
            receiver_fixture
                .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
                .await,
            Err(CanisterError::BackoffThrottled(_))
        ));

        // Advance past backoff and reset rate limit
        ctx.advance_time(Duration::from_secs(2)).await;
        admin_client
            .admin_gate_rate_limit_reset_user(receiver)
            .await
            .unwrap()
            .unwrap();

        // Correct password — should succeed and reset failure counter
        let success = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("correct".to_string()))
            .await;
        assert!(
            success.is_ok(),
            "correct password should succeed: {success:?}"
        );

        // Act — wrong password again (after success reset, new backoff starts at failure #1)
        // Reset rate limit first so only backoff decides the outcome
        admin_client
            .admin_gate_rate_limit_reset_user(receiver)
            .await
            .unwrap()
            .unwrap();

        let _ = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;

        admin_client
            .admin_gate_rate_limit_reset_user(receiver)
            .await
            .unwrap()
            .unwrap();

        let second_retry = receiver_fixture
            .open_link_gate(&link_id, &gate.id, GateKey::Password("wrong".to_string()))
            .await;

        // Assert — new backoff started fresh (failure_count=1, not accumulated from before)
        assert!(
            matches!(second_retry, Err(CanisterError::BackoffThrottled(_))),
            "expected new BackoffThrottled after fresh failure, got {second_retry:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_admin_backoff_update_due_to_unauthorized() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        disable_inspect_message(ctx).await;

        // Act — non-admin tries to update backoff config
        let result = user_client
            .admin_gate_backoff_update(BackoffConfig {
                enabled: false,
                base_wait_secs: 1,
            })
            .await;

        // Assert
        assert!(
            result.unwrap_err().to_string().contains("NotAuthorized"),
            "non-admin should be rejected"
        );

        // Config must remain at default
        let config = admin_client.admin_gate_backoff_get().await.unwrap();
        assert_eq!(config, BackoffConfig::default());

        Ok(())
    })
    .await
    .unwrap();
}
