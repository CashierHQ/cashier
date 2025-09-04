use crate::utils::{
    PocketIcTestContext, PocketIcTestContextBuilder, icrc_112, principal::TestUser,
};
use candid::Principal;
use gate_service_backend_client::client::GateServiceBackendClient;
use gate_service_types::{Gate, GateKey, GateType, NewGate, auth::Permission};
use ic_mple_client::PocketIcClient;
use std::sync::Arc;

pub struct GateTestFixture {
    pub ctx: Arc<PocketIcTestContext>,
    pub caller: Principal,
    pub gate_service_backend_client: Option<GateServiceBackendClient<PocketIcClient>>,
}

impl GateTestFixture {
    pub async fn new(ctx: Arc<PocketIcTestContext>, caller: &Principal) -> Self {
        // Initialize the gate service backend client with the provided caller
        let gate_service_backend_client = Some(ctx.new_gate_service_backend_client(*caller));

        Self {
            ctx,
            caller: *caller,
            gate_service_backend_client,
        }
    }
}

pub async fn add_password_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    password: &str,
) -> Gate {
    // Arrange
    let admin = TestUser::GateServiceBackendAdmin.get_principal();
    let admin_client = ctx.new_gate_service_backend_client(admin);
    let _user_permissions_add = admin_client
        .admin_permissions_add(creator, vec![Permission::GateCreator])
        .await
        .unwrap()
        .unwrap();

    let user_client = ctx.new_gate_service_backend_client(creator);
    let new_gate = NewGate {
        subject_id: "subject1".to_string(),
        gate_type: GateType::Password,
        key: GateKey::Password(password.to_string()),
    };

    user_client.add_gate(new_gate).await.unwrap().unwrap()
}
