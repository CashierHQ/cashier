// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod email;
pub mod sms;

/// Extracts the 6-digit OTP code from a Brevo API request body.
/// Searches for the first isolated sequence of exactly 6 consecutive ASCII digits.
pub(super) fn extract_otp_from_brevo_body(body: &str) -> String {
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
pub(super) async fn send_otp_and_capture_code(
    ctx: &crate::utils::PocketIcTestContext,
    gate_id: &str,
    user: candid::Principal,
    brevo_response_status: u16,
) -> String {
    use gate_service_types::error::GateServiceError;
    use ic_mple_pocket_ic::pocket_ic::common::rest::{
        CanisterHttpReply, CanisterHttpResponse, MockCanisterHttpResponse,
    };

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
