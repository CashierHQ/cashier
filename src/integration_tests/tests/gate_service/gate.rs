use crate::{
    gate_service::fixtures::{
        add_and_open_password_gate_fixture, add_password_gate_fixture,
        add_password_gate_sha256_fixture, add_xfollowing_gate_fixture,
    },
    utils::{principal::TestUser, with_pocket_ic_context},
};
use candid::Principal;
use cashier_common::test_utils::{random_id_string, random_principal_id};
use core::panic;
use gate_service_types::{GateKey, GateStatus, NewGate, auth::Permission, error::GateServiceError};
use ic_mple_pocket_ic::pocket_ic::common::rest::{
    CanisterHttpReply, CanisterHttpResponse, MockCanisterHttpResponse,
};

#[tokio::test]
async fn it_should_error_add_gate_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let user_client = ctx.new_gate_service_client(Principal::anonymous());
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };

        // Act
        let result = user_client.add_gate(new_gate).await;

        // Assert
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("AnonimousUserNotAllowed")
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_add_gate_due_to_unauthorized_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };

        // Act
        let result = user_client.add_gate(new_gate).await;

        // Assert
        assert!(result.unwrap_err().to_string().contains("NotAuthorized"));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_add_password_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::GateServiceAdmin.get_principal();
        let user = TestUser::User1.get_principal();
        let admin_client = ctx.new_gate_service_client(admin);
        let _user_permissions_add = admin_client
            .admin_permissions_add(user, vec![Permission::GateCreate])
            .await
            .unwrap()
            .unwrap();

        let user_client = ctx.new_gate_service_client(user);
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };

        // Act
        let result = user_client.add_gate(new_gate).await.unwrap().unwrap();

        // Assert
        assert!(!result.id.is_empty());
        assert_eq!(result.creator, user);
        assert_eq!(result.subject_id, "subject1");
        assert_eq!(result.key, GateKey::PasswordRedacted);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_add_password_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::GateServiceAdmin.get_principal();
        let user = TestUser::User1.get_principal();
        let admin_client = ctx.new_gate_service_client(admin);
        let _user_permissions_add = admin_client
            .admin_permissions_add(user, vec![Permission::GateCreate])
            .await
            .unwrap()
            .unwrap();

        let user_client = ctx.new_gate_service_client(user);
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };

        let be_cycles_before = ctx.client.cycle_balance(ctx.gate_service_principal).await;

        // Act
        let _result = user_client.add_gate(new_gate).await.unwrap().unwrap();

        // Assert
        let be_cycles_after = ctx.client.cycle_balance(ctx.gate_service_principal).await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!("BE cycles usage for add password gate: {}", cycles_usage);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_open_password_gate_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;
        let user_client = ctx.new_gate_service_client(Principal::anonymous());

        // Act
        let result = user_client
            .open_gate(
                gate.id,
                GateKey::Password("wrong_password".to_string()),
                Principal::anonymous(),
            )
            .await;

        // Assert
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("AnonimousUserNotAllowed")
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_open_password_gate_due_to_invalid_key() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act
        let result = user_client
            .open_gate(
                gate.id,
                GateKey::Password("wrong_password".to_string()),
                user,
            )
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());

        if let Err(GateServiceError::KeyVerificationFailed(e)) = result {
            // Handle the error
            assert!(e.contains("invalid password"));
        } else {
            panic!("Expected KeyVerificationFailed error");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_open_password_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act
        let result = user_client
            .open_gate(
                gate.id.clone(),
                GateKey::Password(password.to_string()),
                user,
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

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_open_password_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);
        let be_cycles_before = ctx.client.cycle_balance(ctx.gate_service_principal).await;

        // Act
        let _result = user_client
            .open_gate(
                gate.id.clone(),
                GateKey::Password(password.to_string()),
                user,
            )
            .await
            .unwrap()
            .unwrap();

        // Assert
        let be_cycles_after = ctx.client.cycle_balance(ctx.gate_service_principal).await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!("BE cycles usage for open password gate: {}", cycles_usage);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_add_password_gate_sha256() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::GateServiceAdmin.get_principal();
        let user = TestUser::User1.get_principal();
        let admin_client = ctx.new_gate_service_client(admin);
        let _user_permissions_add = admin_client
            .admin_permissions_add(user, vec![Permission::GateCreate])
            .await
            .unwrap()
            .unwrap();
        admin_client
            .admin_set_password_hashing_algorithm(
                gate_service_types::PasswordHashingAlgorithm::Sha256,
            )
            .await
            .unwrap()
            .unwrap();

        let user_client = ctx.new_gate_service_client(user);
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            key: GateKey::Password("password123".to_string()),
        };

        let be_cycles_before = ctx.client.cycle_balance(ctx.gate_service_principal).await;

        // Act
        let _result = user_client.add_gate(new_gate).await.unwrap().unwrap();

        // Assert
        let be_cycles_after = ctx.client.cycle_balance(ctx.gate_service_principal).await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!(
            "BE cycles usage for add password gate sha256: {}",
            cycles_usage
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_open_password_gate_sha256() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_sha256_fixture(ctx, creator, &subject_id, &password).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);
        let be_cycles_before = ctx.client.cycle_balance(ctx.gate_service_principal).await;

        // Act
        let _result = user_client
            .open_gate(
                gate.id.clone(),
                GateKey::Password(password.to_string()),
                user,
            )
            .await
            .unwrap()
            .unwrap();

        // Assert
        let be_cycles_after = ctx.client.cycle_balance(ctx.gate_service_principal).await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!(
            "BE cycles usage for open password gate sha256: {}",
            cycles_usage
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_get_gate_by_subject_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;

        // Act
        let result = ctx
            .new_gate_service_client(Principal::anonymous())
            .get_gate_by_subject(gate.subject_id.clone())
            .await;

        // Assert
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("AnonimousUserNotAllowed")
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_get_gate_by_subject_due_to_unauthorized_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;

        // Act
        let result = ctx
            .new_gate_service_client(TestUser::User1.get_principal())
            .get_gate_by_subject(gate.subject_id.clone())
            .await;

        // Assert
        assert!(result.unwrap_err().to_string().contains("NotAuthorized"));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_gate_by_subject() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;

        // Act
        let result = ctx
            .new_gate_service_client(creator)
            .get_gate_by_subject(gate.subject_id.clone())
            .await
            .unwrap()
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.id, gate.id);
        assert_eq!(result.creator, creator);
        assert_eq!(result.subject_id, subject_id);
        assert_eq!(result.key, GateKey::PasswordRedacted);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_gate_by_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;

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
        assert_eq!(result.key, GateKey::PasswordRedacted);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_get_gate_for_user_due_to_unauthorized_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;
        let user = TestUser::User1.get_principal();
        let caller = random_principal_id();
        let caller_client = ctx.new_gate_service_client(caller);

        // Act
        let result = caller_client
            .get_gate_for_user(gate.id.clone(), user)
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());

        if let Err(GateServiceError::AuthError(e)) = result {
            // Handle the error
            assert!(e.contains("Only the user or a GateCreator can get the gate for a user"));
        } else {
            panic!("Expected AuthError error");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_gate_for_user_for_authorized_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act
        let result = user_client
            .get_gate_for_user(gate.id.clone(), user)
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.gate.id, gate.id);
        assert_eq!(result.gate.subject_id, subject_id);
        assert!(result.gate_user_status.is_none());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_gate_for_user_for_authorized_gate_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &subject_id, &password).await;
        let user = TestUser::User1.get_principal();
        let caller_client = ctx.new_gate_service_client(creator);

        // Act
        let result = caller_client
            .get_gate_for_user(gate.id.clone(), user)
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.gate.id, gate.id);
        assert_eq!(result.gate.subject_id, subject_id);
        assert!(result.gate_user_status.is_none());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_gate_for_user_with_open_status_after_opening() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let password = random_id_string();
        let user = TestUser::User1.get_principal();
        let (gate, _gate_user_status) =
            add_and_open_password_gate_fixture(ctx, creator, &subject_id, &password, user).await;

        // Act
        let result = ctx
            .new_gate_service_client(user)
            .get_gate_for_user(gate.id.clone(), user)
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.gate.id, gate.id);
        assert_eq!(result.gate.subject_id, subject_id);
        assert!(result.gate_user_status.is_some());
        assert_eq!(result.gate_user_status.unwrap().status, GateStatus::Open);

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
        let gate =
            add_xfollowing_gate_fixture(ctx, creator, &subject_id, target_handle).await;
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

#[tokio::test]
async fn it_should_fail_open_xfollowing_gate_due_to_not_following() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let target_handle = "cashierapp";
        let source_handle = "alice";
        let gate =
            add_xfollowing_gate_fixture(ctx, creator, &subject_id, target_handle).await;
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
