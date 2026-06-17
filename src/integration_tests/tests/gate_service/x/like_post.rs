use crate::{
    gate_service::fixtures::add_xlikedpost_gate_fixture,
    utils::{principal::TestUser, with_pocket_ic_context},
};
use cashier_common::test_utils::{random_id_string, random_principal_id};
use gate_service_types::{GateKey, GateStatus, error::GateServiceError};
use ic_mple_pocket_ic::pocket_ic::common::rest::{
    CanisterHttpReply, CanisterHttpResponse, MockCanisterHttpResponse,
};

const TWEET_URL: &str = "https://x.com/cashierapp/status/1234567890";
const TWEET_ID: &str = "1234567890";
const USER_ID: &str = "987654321";
const ACCESS_TOKEN: &str = "test_user_access_token";

#[tokio::test]
async fn it_should_fail_open_xlikedpost_gate_due_to_wrong_key_type() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_xlikedpost_gate_fixture(ctx, creator, &subject_id, TWEET_URL).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act - provide wrong key type (Password instead of XLikedPostCredential)
        let result = user_client
            .open_gate(gate.id, GateKey::Password("wrong".to_string()), user)
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("XLikedPostVerifier"));
        } else {
            panic!("Expected InvalidKeyType error but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_open_xlikedpost_gate_due_to_tweet_not_liked() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_xlikedpost_gate_fixture(ctx, creator, &subject_id, TWEET_URL).await;
        let user = TestUser::User1.get_principal();
        let raw_client = ctx.new_client(ctx.gate_service_principal, user);

        // Act - submit open_gate call
        let msg_id = raw_client
            .submit_call(
                "open_gate",
                (
                    gate.id.clone(),
                    GateKey::XLikedPostCredential {
                        user_id: USER_ID.to_string(),
                        access_token: ACCESS_TOKEN.to_string(),
                    },
                    user,
                ),
            )
            .await
            .unwrap();

        // Two ticks needed: one for the canister to make the HTTP outcall,
        // one for the management canister to start processing it.
        ctx.client.tick().await;
        ctx.client.tick().await;

        // Mock the X API response: liked tweets list does NOT include our tweet
        let pending_http = ctx.client.get_canister_http().await;
        assert!(!pending_http.is_empty(), "Expected a pending HTTP request");
        let request = &pending_http[0];
        let body = r#"{"data":[{"id":"999999999","referenced_tweets":null}]}"#;
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

        // Assert - should fail because the tweet is not in the liked list
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(msg.contains(TWEET_ID));
        } else {
            panic!("Expected KeyVerificationFailed error but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_open_xlikedpost_gate_due_to_api_error() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_xlikedpost_gate_fixture(ctx, creator, &subject_id, TWEET_URL).await;
        let user = TestUser::User1.get_principal();
        let raw_client = ctx.new_client(ctx.gate_service_principal, user);

        // Act - submit open_gate call
        let msg_id = raw_client
            .submit_call(
                "open_gate",
                (
                    gate.id.clone(),
                    GateKey::XLikedPostCredential {
                        user_id: USER_ID.to_string(),
                        access_token: ACCESS_TOKEN.to_string(),
                    },
                    user,
                ),
            )
            .await
            .unwrap();

        // Two ticks needed: one for the canister to make the HTTP outcall,
        // one for the management canister to start processing it.
        ctx.client.tick().await;
        ctx.client.tick().await;

        // Mock a 429 Too Many Requests response from the X API
        let pending_http = ctx.client.get_canister_http().await;
        assert!(!pending_http.is_empty(), "Expected a pending HTTP request");
        let request = &pending_http[0];
        let body = r#"{"title":"Too Many Requests","status":429}"#;
        ctx.client
            .mock_canister_http_response(MockCanisterHttpResponse {
                subnet_id: request.subnet_id,
                request_id: request.request_id,
                response: CanisterHttpResponse::CanisterHttpReply(CanisterHttpReply {
                    status: 429,
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

        // Assert - the HTTP error propagates as a verification failure
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(msg.contains("429"));
        } else {
            panic!("Expected KeyVerificationFailed error but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_add_xlikedpost_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();

        // Act
        let gate = add_xlikedpost_gate_fixture(ctx, creator, &subject_id, TWEET_URL).await;

        // Assert
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
        assert_eq!(gate.key, GateKey::XLikedPost(TWEET_URL.to_string()));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_open_xlikedpost_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_xlikedpost_gate_fixture(ctx, creator, &subject_id, TWEET_URL).await;
        let user = TestUser::User1.get_principal();
        let raw_client = ctx.new_client(ctx.gate_service_principal, user);

        // Act - submit open_gate call (will pause waiting for HTTP outcall)
        let msg_id = raw_client
            .submit_call(
                "open_gate",
                (
                    gate.id.clone(),
                    GateKey::XLikedPostCredential {
                        user_id: USER_ID.to_string(),
                        access_token: ACCESS_TOKEN.to_string(),
                    },
                    user,
                ),
            )
            .await
            .unwrap();

        // Two ticks needed: one for the canister to make the HTTP outcall,
        // one for the management canister to start processing it.
        ctx.client.tick().await;
        ctx.client.tick().await;

        // Mock the X API response: liked tweets list includes our tweet
        let pending_http = ctx.client.get_canister_http().await;
        assert!(!pending_http.is_empty(), "Expected a pending HTTP request");
        let request = &pending_http[0];
        let body = format!(
            r#"{{"data":[{{"id":"{}","referenced_tweets":null}}]}}"#,
            TWEET_ID
        );
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
