// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    gate_service::fixtures::{add_password_gate_fixture, add_password_gate_sha256_fixture},
    utils::{principal::TestUser, with_pocket_ic_context},
};
use candid::Principal;
use cashier_common::test_utils::{random_id_string, random_principal_id};
use gate_service_types::{GateKey, GateStatus, NewGate, auth::Permission, error::GateServiceError};

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
            assert!(e.contains("invalid password"));
        } else {
            panic!("Expected KeyVerificationFailed error but got {:?}", result);
        }

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
