// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::error::CanisterError;
use gate_service_types::{GateKey, GateStatus, OpenGateSuccessResult};
use ic_mple_pocket_ic::pocket_ic::common::rest::{
    CanisterHttpReply, CanisterHttpResponse, MockCanisterHttpResponse,
};

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, x_gate::fixture::activated_xgate_link_fixture,
    },
    utils::{principal::TestUser, with_pocket_ic_context},
};

/// Submits an open_link_gate call on the cashier backend and mocks the TwitterAPI.io HTTP response.
///
/// Because the gate_service makes an HTTP outcall to verify follow status, the call must be
/// submitted asynchronously and the HTTP response must be mocked before awaiting the result.
async fn open_xgate_with_http_mock(
    link_fixture: &LinkTestFixtureV3,
    caller: candid::Principal,
    link_id: &str,
    gate_id: &str,
    source_handle: &str,
    following: bool,
) -> Result<OpenGateSuccessResult, CanisterError> {
    let raw_client = link_fixture
        .ctx
        .new_client(link_fixture.ctx.cashier_backend_principal, caller);

    // Submit the call — it will pause internally waiting for the gate_service HTTP outcall
    let msg_id = raw_client
        .submit_call(
            "user_open_link_gate",
            (
                link_id.to_string(),
                gate_id.to_string(),
                GateKey::XFollowing(source_handle.to_string()),
            ),
        )
        .await
        .expect("submit_call should succeed");

    // Tick to start execution and propagate the inter-canister call
    link_fixture.ctx.client.tick().await;
    link_fixture.ctx.client.tick().await;

    // Get the pending HTTP outcall from gate_service
    let pending_http = link_fixture.ctx.client.get_canister_http().await;
    assert!(
        !pending_http.is_empty(),
        "Expected a pending TwitterAPI.io HTTP request"
    );
    let request = &pending_http[0];

    // Mock the TwitterAPI.io response
    let body = if following {
        r#"{"status":"success","message":"check follow relationship success","data":{"following":true,"followed_by":false}}"#
    } else {
        r#"{"status":"success","message":"check follow relationship success","data":{"following":false,"followed_by":false}}"#
    };

    link_fixture
        .ctx
        .client
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

    // Await the cashier backend call result
    raw_client
        .await_call::<Result<OpenGateSuccessResult, CanisterError>>(msg_id)
        .await
        .expect("await_call should succeed")
}

#[tokio::test]
async fn it_should_fail_open_gate_with_wrong_username() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_xgate_link_fixture(ctx, "cashierapp").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act — alice is not following cashierapp
        let result = open_xgate_with_http_mock(
            &receiver_fixture,
            receiver,
            &link_id,
            &gate.id,
            "alice",
            false, // not following
        )
        .await;

        // Assert
        assert!(result.is_err());
        assert!(
            matches!(result, Err(CanisterError::Unauthorized(_))),
            "expected Unauthorized when not following, got {:?}",
            result
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_open_gate_with_correct_username() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link_id, gate) =
            activated_xgate_link_fixture(ctx, "cashierapp").await;

        let receiver = TestUser::User2.get_principal();
        let icp_fee = creator_fixture.icp_ledger_fee.clone();
        let receiver_fixture =
            LinkTestFixtureV3::new(creator_fixture.ctx.clone(), receiver, icp_fee).await;

        // Act — alice is following cashierapp
        let result = open_xgate_with_http_mock(
            &receiver_fixture,
            receiver,
            &link_id,
            &gate.id,
            "alice",
            true, // following
        )
        .await;

        // Assert
        assert!(result.is_ok(), "expected Ok, got {:?}", result);
        let open_result = result.unwrap();
        assert_eq!(open_result.gate.id, gate.id);
        assert_eq!(open_result.gate_user_status.user_id, receiver);
        assert_eq!(open_result.gate_user_status.status, GateStatus::Open);

        Ok(())
    })
    .await
    .unwrap();
}
