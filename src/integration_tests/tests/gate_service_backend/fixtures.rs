use crate::utils::{PocketIcTestContext, principal::TestUser};
use candid::Principal;
use gate_service_types::{Gate, GateKey, GateType, GateUserStatus, NewGate, auth::Permission};

/// Adds a password gate fixture for testing purposes.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `password` - The password for the gate.
/// # Returns
/// The created password gate.
pub async fn add_password_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    password: &str,
) -> Gate {
    let admin = TestUser::GateServiceBackendAdmin.get_principal();
    let admin_client = ctx.new_gate_service_backend_client(admin);
    let _user_permissions_add = admin_client
        .admin_permissions_add(creator, vec![Permission::GateCreator])
        .await
        .unwrap()
        .unwrap();

    let user_client = ctx.new_gate_service_backend_client(creator);
    let new_gate = NewGate {
        subject_id: subject_id.to_string(),
        gate_type: GateType::Password,
        key: GateKey::Password(password.to_string()),
    };

    user_client.add_gate(new_gate).await.unwrap().unwrap()
}

/// Adds and opens a password gate fixture for testing purposes.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `password` - The password for the gate.
/// # Returns
/// The created password gate and its user status.
pub async fn add_and_open_password_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    password: &str,
    user: Principal,
) -> (Gate, GateUserStatus) {
    let gate = add_password_gate_fixture(ctx, creator, subject_id, password).await;
    let user_client = ctx.new_gate_service_backend_client(user);
    let open_gate_result = user_client
        .open_gate(gate.id.clone(), GateKey::Password(password.to_string()))
        .await
        .unwrap()
        .unwrap();

    (gate, open_gate_result.gate_user_status.clone())
}
