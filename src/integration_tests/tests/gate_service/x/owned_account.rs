use crate::{
    gate_service::fixtures::add_xowned_account_gate_fixture,
    utils::{principal::TestUser, with_pocket_ic_context},
};
use cashier_common::test_utils::{random_id_string, random_principal_id};
use gate_service_types::{GateKey, GateStatus, error::GateServiceError};

#[tokio::test]
async fn it_should_fail_open_owned_account_gate_due_to_wrong_key_type() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_xowned_account_gate_fixture(ctx, creator, &subject_id, "cashierapp").await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act - provide wrong key type (Password instead of XOwnedAccount)
        let result = user_client
            .open_gate(gate.id, GateKey::Password("wrong".to_string()), user)
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::InvalidKeyType(e)) = result {
            assert!(e.contains("XOwnedAccountVerifier"));
        } else {
            panic!("Expected InvalidKeyType error but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_open_owned_account_gate_due_to_handle_mismatch() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let gate = add_xowned_account_gate_fixture(ctx, creator, &subject_id, "cashierapp").await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act - provide a handle that does not match the gate target
        let result = user_client
            .open_gate(gate.id, GateKey::XOwnedAccount("alice".to_string()), user)
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(GateServiceError::KeyVerificationFailed(msg)) = result {
            assert!(msg.contains("alice"));
            assert!(msg.contains("cashierapp"));
        } else {
            panic!("Expected KeyVerificationFailed error but got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_add_xowned_account_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let target_handle = "cashierapp";

        // Act
        let gate = add_xowned_account_gate_fixture(ctx, creator, &subject_id, target_handle).await;

        // Assert
        assert!(!gate.id.is_empty());
        assert_eq!(gate.creator, creator);
        assert_eq!(gate.subject_id, subject_id);
        assert_eq!(gate.key, GateKey::XOwnedAccount(target_handle.to_string()));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_open_xowned_account_gate() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let creator = random_principal_id();
        let subject_id = random_id_string();
        let target_handle = "cashierapp";
        let gate = add_xowned_account_gate_fixture(ctx, creator, &subject_id, target_handle).await;
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_gate_service_client(user);

        // Act - handle comparison is case-insensitive
        let result = user_client
            .open_gate(
                gate.id.clone(),
                GateKey::XOwnedAccount("CashierApp".to_string()),
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
