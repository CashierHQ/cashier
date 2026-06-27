// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    gate_service::fixtures::add_xfollowing_gate_fixture,
    utils::{principal::TestUser, with_pocket_ic_context},
};
use cashier_common::test_utils::{random_id_string, random_principal_id};
use gate_service_types::{GateKey, GateStatus, error::GateServiceError};
use ic_mple_pocket_ic::pocket_ic::common::rest::{
    CanisterHttpReply, CanisterHttpResponse, MockCanisterHttpResponse,
};

#[tokio::test]
async fn it_should_fail_open_xfollowing_gate_due_to_wrong_key_type() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_xfollowing_gate_fixture(ctx, creator, &subject_id, "cashierapp").await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act - provide wrong key type (Password instead of XFollowing)
        let result = user_client
            .open_gate(gate.id, GateKey::Password("wrong".to_string()), user)
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("XFollowingVerifier"));
        } else {
            panic!("Expected InvalidKeyType error but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_open_xfollowing_gate_due_to_not_following() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let target_handle = "cashierapp";
        let source_handle = "alice";
        let gate = add_xfollowing_gate_fixture(ctx, creator, &subject_id, target_handle).await;
        let user = TestUser::User1.get_principal();
        let raw_client = ctx.new_client(ctx.gate_service_principal, user);

        // Act - submit open_gate call
        let msg_id = raw_client
            .submit_call(
                "open_gate",
                (
                    gate.id.clone(),
                    GateKey::XFollowing(source_handle.to_string()),
                    user,
                ),
            )
            .await
            .unwrap();

        // Two ticks needed: one for the canister to make the HTTP outcall,
        // one for the management canister to start processing it.
        ctx.client.tick().await;
        ctx.client.tick().await;

        // Mock the TwitterAPI.io response (following = false)
        let pending_http = ctx.client.get_canister_http().await;
        assert!(!pending_http.is_empty(), "Expected a pending HTTP request");
        let request = &pending_http[0];
        let body = r#"{"status":"success","message":"check follow relationship success","data":{"following":false,"followed_by":false}}"#;
        ctx.client
            .mock_canister_http_response(MockCanisterHttpResponse {
                subnet_id: request.subnet_id,
                request_id: request.request_id,
                response: CanisterHttpResponse::CanisterHttpReply(CanisterHttpReply {
                    status: 200,
                    headers: vec![],
                    body: body.as_bytes().to_vec(),
                }),
                additional_responses: vec![],
            })
            .await;

        // Await the result
        let result = raw_client
            .await_call::<Result<gate_service_types::OpenGateSuccessResult, GateServiceError>>(
                msg_id,
            )
            .await
            .unwrap();

        // Assert - should fail because alice is not following cashierapp
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(msg.contains("not following"));
        } else {
            panic!("Expected KeyVerificationFailed error but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_add_xfollowing_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let target_handle = "cashierapp";

        // Act
        let gate = add_xfollowing_gate_fixture(ctx, creator, &subject_id, target_handle).await;

        // Assert
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
        assert_eq!(gate.key, GateKey::XFollowing(target_handle.to_string()));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_xfollowing_gate_by_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let target_handle = "cashierapp";
        let gate = add_xfollowing_gate_fixture(ctx, creator, &subject_id, target_handle).await;

        // Act
        let result = ctx
            .new_gate_service_client(TestUser::User1.get_principal())
            .get_gate(gate.id.clone())
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.id, gate.id);
        assert_eq!(result.creator, creator);
        assert_eq!(result.subject_id, subject_id);
        assert_eq!(result.key, GateKey::XFollowing(target_handle.to_string()));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_open_xfollowing_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let target_handle = "cashierapp";
        let source_handle = "alice";
        let gate = add_xfollowing_gate_fixture(ctx, creator, &subject_id, target_handle).await;
        let user = TestUser::User1.get_principal();
        let raw_client = ctx.new_client(ctx.gate_service_principal, user);

        // Act - submit open_gate call (will pause waiting for HTTP outcall)
        let msg_id = raw_client
            .submit_call(
                "open_gate",
                (
                    gate.id.clone(),
                    GateKey::XFollowing(source_handle.to_string()),
                    user,
                ),
            )
            .await
            .unwrap();

        // Two ticks needed: one for the canister to make the HTTP outcall,
        // one for the management canister to start processing it.
        ctx.client.tick().await;
        ctx.client.tick().await;

        // Mock the TwitterAPI.io response (following = true)
        let pending_http = ctx.client.get_canister_http().await;
        assert!(!pending_http.is_empty(), "Expected a pending HTTP request");
        let request = &pending_http[0];
        let body = r#"{"status":"success","message":"check follow relationship success","data":{"following":true,"followed_by":false}}"#;
        ctx.client
            .mock_canister_http_response(MockCanisterHttpResponse {
                subnet_id: request.subnet_id,
                request_id: request.request_id,
                response: CanisterHttpResponse::CanisterHttpReply(CanisterHttpReply {
                    status: 200,
                    headers: vec![],
                    body: body.as_bytes().to_vec(),
                }),
                additional_responses: vec![],
            })
            .await;

        // Await the result
        let result = raw_client
            .await_call::<Result<gate_service_types::OpenGateSuccessResult, GateServiceError>>(
                msg_id,
            )
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
