use core::panic;

use crate::{
    gate_service_backend::fixtures::add_password_gate_fixture,
    utils::{principal::TestUser, with_pocket_ic_context},
};
use cashier_common::test_utils::{random_id_string, random_principal_id};
use gate_service_types::{
    GateKey, GateStatus, GateType, NewGate, auth::Permission, error::GateServiceError,
};

#[tokio::test]
async fn it_should_error_add_gate_due_to_unauthorized() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_backend_client(user);
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            gate_type: GateType::Password,
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
async fn it_should_add_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::GateServiceBackendAdmin.get_principal();
        let user = TestUser::User1.get_principal();
        let admin_client = ctx.new_gate_service_backend_client(admin);
        let _user_permissions_add = admin_client
            .admin_permissions_add(user, vec![Permission::GateCreator])
            .await
            .unwrap()
            .unwrap();

        let user_client = ctx.new_gate_service_backend_client(user);
        let new_gate = NewGate {
            subject_id: "subject1".to_string(),
            gate_type: GateType::Password,
            key: GateKey::Password("password123".to_string()),
        };

        // Act
        let result = user_client.add_gate(new_gate).await.unwrap().unwrap();

        // Assert
        assert!(!result.id.is_empty());
        assert_eq!(result.gate_type, GateType::Password);
        assert_eq!(result.key, GateKey::PasswordRedacted);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_open_password_gate_dueto_invalid_key() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &password).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_backend_client(user);

        // Act
        let result = user_client
            .open_gate(gate.id, GateKey::Password("wrong_password".to_string()))
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
        let password = random_id_string();
        let gate = add_password_gate_fixture(ctx, creator, &password).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_backend_client(user);

        // Act
        let result = user_client
            .open_gate(gate.id.clone(), GateKey::Password(password.to_string()))
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
