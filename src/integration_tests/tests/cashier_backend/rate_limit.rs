// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{error::CanisterError, rate_limit::RateLimitConfig};

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, password_gate::fixture::activated_password_gate_link_fixture,
    },
    utils::{principal::TestUser, with_pocket_ic_context},
};

// Disable the inspect message so that non-admin callers reach the endpoint
// and we can assert on the canister-level error rather than a reject.
async fn disable_inspect_message(ctx: &crate::utils::PocketIcTestContext) {
    let admin = TestUser::CashierBackendAdmin.get_principal();
    ctx.new_cashier_backend_client(admin)
        .admin_inspect_message_enable(false)
        .await
        .unwrap()
        .unwrap();
}

#[tokio::test]
async fn it_should_fail_second_open_gate_due_to_rate_limit() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange — one active gated link, two different callers sharing the same gate
        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // First open — should succeed
        let first = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await;
        assert!(
            first.is_ok(),
            "first open_gate call should succeed: {first:?}"
        );

        // Act — second open in the same window
        let second = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await;

        // Assert
        assert!(
            matches!(second, Err(CanisterError::RateLimited(_))),
            "expected RateLimited on second call, got {second:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_open_gate_after_admin_updates_limit() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Raise limit to 5 req/min
        admin_client
            .admin_rate_limit_update(RateLimitConfig {
                enabled: true,
                max_requests: 5,
                window_secs: 60,
            })
            .await
            .unwrap()
            .unwrap();

        // Act — 5 calls should all succeed
        for _ in 0..5 {
            let result = receiver_fixture
                .open_link_gate(
                    &link_id,
                    &gate.id,
                    gate_service_types::GateKey::Password("secret".to_string()),
                )
                .await;
            assert!(
                result.is_ok(),
                "call should succeed with limit=5: {result:?}"
            );
        }

        // Assert — 6th call is rejected
        let sixth = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await;
        assert!(
            matches!(sixth, Err(CanisterError::RateLimited(_))),
            "expected RateLimited on 6th call, got {sixth:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_open_gate_when_rate_limit_disabled() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Disable rate limiting
        admin_client
            .admin_rate_limit_update(RateLimitConfig {
                enabled: false,
                max_requests: 1,
                window_secs: 60,
            })
            .await
            .unwrap()
            .unwrap();

        // Act — multiple calls should all pass when disabled
        for _ in 0..3 {
            let result = receiver_fixture
                .open_link_gate(
                    &link_id,
                    &gate.id,
                    gate_service_types::GateKey::Password("secret".to_string()),
                )
                .await;
            assert!(
                result.is_ok(),
                "call should succeed when rate limit disabled: {result:?}"
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_open_gate_after_admin_resets_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Exhaust the default limit
        receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await
            .expect("first call should succeed");

        let blocked = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await;
        assert!(matches!(blocked, Err(CanisterError::RateLimited(_))));

        // Admin resets the user
        admin_client
            .admin_rate_limit_reset_user(receiver)
            .await
            .unwrap()
            .unwrap();

        // Act — should be allowed again
        let result = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await;

        // Assert
        assert!(
            result.is_ok(),
            "call after reset should succeed: {result:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_block_all_requests_when_max_requests_is_zero() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange — max_requests=0 means estimated (0.0) >= 0.0 is true on every call
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        admin_client
            .admin_rate_limit_update(RateLimitConfig {
                enabled: true,
                max_requests: 0,
                window_secs: 60,
            })
            .await
            .unwrap()
            .unwrap();

        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act — even the very first request is rejected
        let result = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await;

        // Assert
        assert!(
            matches!(result, Err(CanisterError::RateLimited(_))),
            "expected RateLimited when max_requests=0, got {result:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_bypass_rate_limit_when_window_secs_is_zero() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange — window_secs=0 makes every request start a fresh window with
        // prev_count=0 and current_count=0, so estimated=0.0 < max_requests → always passes
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        admin_client
            .admin_rate_limit_update(RateLimitConfig {
                enabled: true,
                max_requests: 1,
                window_secs: 0,
            })
            .await
            .unwrap()
            .unwrap();

        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act — 5 rapid correct-password calls; none should be rate-limited
        for i in 0..5u32 {
            let result = receiver_fixture
                .open_link_gate(
                    &link_id,
                    &gate.id,
                    gate_service_types::GateKey::Password("secret".to_string()),
                )
                .await;
            assert!(
                result.is_ok(),
                "call {i} should succeed when window_secs=0, got {result:?}"
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_admin_update_due_to_unauthorized() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let user = TestUser::User1.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let user_client = ctx.new_cashier_backend_client(user);

        disable_inspect_message(ctx).await;

        // Act
        let result = user_client
            .admin_rate_limit_update(RateLimitConfig {
                enabled: false,
                max_requests: 100,
                window_secs: 1,
            })
            .await;

        // Assert
        assert!(
            result.unwrap_err().to_string().contains("NotAuthorized"),
            "non-admin should be rejected"
        );

        // Verify config was not changed
        let config = admin_client.admin_rate_limit_get().await.unwrap();
        assert_eq!(config, RateLimitConfig::default());

        Ok(())
    })
    .await
    .unwrap();
}

// `user_open_link_gate` and `user_send_otp` share one `RateLimitConfig`, but each gets its
// own independent counter. These tests prove that isolation: they're two steps of the same
// OTP flow (request a code, then submit it), so a shared counter would mean requesting the
// code exhausts the budget needed to submit it back.

#[tokio::test]
async fn it_should_not_block_open_gate_after_send_otp_for_same_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // send_otp against an arbitrary gate id — the guard fires before the downstream
        // call, so it doesn't matter that this isn't an OTP-type gate.
        let _ = receiver_fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .user_send_otp("nonexistent-gate-id")
            .await
            .unwrap();

        // Act — open_link_gate for the same user, same window
        let result = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await;

        // Assert — not blocked by the prior send_otp call
        assert!(
            result.is_ok(),
            "open_link_gate should not be rate-limited by a prior send_otp call: {result:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_not_block_send_otp_after_open_gate_for_same_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_password_gate_link_fixture(ctx, "secret").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Exhaust GateOpen's budget first
        let opened = receiver_fixture
            .open_link_gate(
                &link_id,
                &gate.id,
                gate_service_types::GateKey::Password("secret".to_string()),
            )
            .await;
        assert!(
            opened.is_ok(),
            "first open_gate call should succeed: {opened:?}"
        );

        // Act — send_otp for the same user, same window
        let result = receiver_fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .user_send_otp("nonexistent-gate-id")
            .await
            .unwrap();

        // Assert — not blocked by the prior open_gate call
        assert!(
            !matches!(result, Err(CanisterError::RateLimited(_))),
            "send_otp should not be rate-limited by a prior open_gate call: {result:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_second_send_otp_due_to_rate_limit() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        // First call — should reach the guard and pass it, failing downstream instead
        // since "nonexistent-gate-id" isn't a real gate.
        let first = user_client
            .user_send_otp("nonexistent-gate-id")
            .await
            .unwrap();
        assert!(
            !matches!(first, Err(CanisterError::RateLimited(_))),
            "first call should not be rate-limited: {first:?}"
        );

        // Act — second call in the same window
        let second = user_client
            .user_send_otp("nonexistent-gate-id")
            .await
            .unwrap();

        // Assert
        assert!(
            matches!(second, Err(CanisterError::RateLimited(_))),
            "expected RateLimited on second call, got {second:?}"
        );

        Ok(())
    })
    .await
    .unwrap();
}
