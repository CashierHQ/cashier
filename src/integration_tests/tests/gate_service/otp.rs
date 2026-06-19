// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    gate_service::fixtures::{add_otp_email_gate_fixture, add_otp_sms_gate_fixture},
    utils::{principal::TestUser, with_pocket_ic_context},
};
use cashier_common::test_utils::{random_id_string, random_principal_id};
use gate_service_types::{GateKey, GateStatus, error::GateServiceError};
use ic_mple_pocket_ic::pocket_ic::common::rest::{
    CanisterHttpReply, CanisterHttpResponse, MockCanisterHttpResponse,
};

/// Extracts the 6-digit OTP code from a Brevo API request body.
/// Searches for the first isolated sequence of exactly 6 consecutive ASCII digits.
fn extract_otp_from_brevo_body(body: &str) -> String {
    let chars: Vec<char> = body.chars().collect();
    for i in 0..chars.len() {
        if i + 6 > chars.len() {
            break;
        }
        if chars[i..i + 6].iter().all(|c| c.is_ascii_digit()) {
            let before_ok = i == 0 || !chars[i - 1].is_ascii_digit();
            let after_ok = i + 6 >= chars.len() || !chars[i + 6].is_ascii_digit();
            if before_ok && after_ok {
                return chars[i..i + 6].iter().collect();
            }
        }
    }
    panic!("No 6-digit OTP code found in Brevo request body: {}", body);
}

/// Submits `send_otp`, ticks, mocks the Brevo response, and returns the OTP code
/// that was embedded in the Brevo request body.
async fn send_otp_and_capture_code(
    ctx: &crate::utils::PocketIcTestContext,
    gate_id: &str,
    user: candid::Principal,
    brevo_response_status: u16,
) -> String {
    let raw_client = ctx.new_client(ctx.gate_service_principal, user);

    let msg_id = raw_client
        .submit_call("send_otp", (gate_id.to_string(), user))
        .await
        .unwrap();

    // Give the canister enough rounds to: process message → raw_rand() round-trip →
    // http_request() enqueued. In practice 5 ticks is ample.
    for _ in 0..5 {
        ctx.client.tick().await;
        let pending_http = ctx.client.get_canister_http().await;
        if !pending_http.is_empty() {
            break;
        }
    }

    let pending_http = ctx.client.get_canister_http().await;
    assert!(
        !pending_http.is_empty(),
        "Expected a pending HTTP request to Brevo"
    );
    let request = &pending_http[0];
    let body_str =
        String::from_utf8(request.body.clone()).expect("Brevo request body is not UTF-8");
    let otp_code = extract_otp_from_brevo_body(&body_str);

    ctx.client
        .mock_canister_http_response(MockCanisterHttpResponse {
            subnet_id: request.subnet_id,
            request_id: request.request_id,
            response: CanisterHttpResponse::CanisterHttpReply(CanisterHttpReply {
                status: brevo_response_status,
                headers: vec![],
                body: b"{}".to_vec(),
            }),
            additional_responses: vec![],
        })
        .await;

    let result = raw_client
        .await_call::<Result<(), GateServiceError>>(msg_id)
        .await
        .unwrap();

    assert!(result.is_ok(), "send_otp failed: {:?}", result);

    otp_code
}

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

#[tokio::test]
async fn it_should_send_and_open_otp_sms_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_otp_sms_gate_fixture(ctx, creator, &subject_id, "+1234567890").await;
        let user = TestUser::User1.get_principal();

        // Act: send OTP (Brevo SMS returns 200)
        let otp_code = send_otp_and_capture_code(ctx, &gate.id, user, 200).await;

        // Open gate with the correct OTP code
        let user_client = ctx.new_gate_service_client(user);
        let result = user_client
            .open_gate(gate.id.clone(), GateKey::OTPSms(otp_code), user)
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
