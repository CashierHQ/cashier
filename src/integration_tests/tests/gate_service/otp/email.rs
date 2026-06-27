// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use super::send_otp_and_capture_code;
use crate::{
    gate_service::fixtures::add_otp_email_gate_fixture,
    utils::{principal::TestUser, with_pocket_ic_context},
};
use cashier_common::test_utils::{random_id_string, random_principal_id};
use gate_service_types::{GateKey, GateStatus, error::GateServiceError};

// ── failure cases ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn it_should_fail_send_otp_due_to_missing_brevo_api_key() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: create an OTP email gate WITHOUT seeding the brevo_api_key secret
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let admin = TestUser::GateServiceAdmin.get_principal();
        let admin_client = ctx.new_gate_service_client(admin);
        admin_client
            .admin_permissions_add(
                creator,
                vec![gate_service_types::auth::Permission::GateCreate],
            )
            .await
            .unwrap()
            .unwrap();
        let creator_client = ctx.new_gate_service_client(creator);
        let gate = creator_client
            .add_gate(gate_service_types::NewGate {
                subject_id: subject_id.clone(),
                key: GateKey::OTPEmail("test@example.com".to_string()),
            })
            .await
            .unwrap()
            .unwrap();

        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act: send_otp should fail because brevo_api_key is not set
        let result = user_client.send_otp(gate.id, user).await.unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains("brevo_api_key"),
                "Expected error mentioning brevo_api_key, got: {}",
                msg
            );
        } else {
            panic!("Expected KeyVerificationFailed but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_open_otp_email_gate_due_to_no_otp_sent() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_otp_email_gate_fixture(ctx, creator, &subject_id, "test@example.com").await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act: try to open gate without sending OTP first
        let result = user_client
            .open_gate(gate.id, GateKey::OTPEmail("123456".to_string()), user)
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains("No OTP code found"),
                "Expected 'No OTP code found' but got: {}",
                msg
            );
        } else {
            panic!("Expected KeyVerificationFailed but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_open_otp_email_gate_due_to_wrong_code() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_otp_email_gate_fixture(ctx, creator, &subject_id, "test@example.com").await;
        let user = TestUser::User1.get_principal();

        let _otp_code = send_otp_and_capture_code(ctx, &gate.id, user, 201).await;

        let user_client = ctx.new_gate_service_client(user);

        // Act: submit an incorrect OTP code
        let result = user_client
            .open_gate(gate.id, GateKey::OTPEmail("000000".to_string()), user)
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(
                msg.contains("Invalid OTP code"),
                "Expected 'Invalid OTP code' but got: {}",
                msg
            );
        } else {
            panic!("Expected KeyVerificationFailed but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

// ── success cases ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn it_should_send_and_open_otp_email_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_otp_email_gate_fixture(ctx, creator, &subject_id, "test@example.com").await;
        let user = TestUser::User1.get_principal();

        // Act: send OTP (captures code from Brevo request body)
        let otp_code = send_otp_and_capture_code(ctx, &gate.id, user, 201).await;

        // Open gate with the correct OTP code
        let user_client = ctx.new_gate_service_client(user);
        let result = user_client
            .open_gate(gate.id.clone(), GateKey::OTPEmail(otp_code), user)
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.gate.id, gate.id);
        assert_eq!(result.gate_user_status.gate_id, gate.id);
        assert_eq!(result.gate_user_status.user_id, user);
        assert_eq!(result.gate_user_status.status, GateStatus::Open);

        Ok(())
    })
    .await
    .unwrap();
}
