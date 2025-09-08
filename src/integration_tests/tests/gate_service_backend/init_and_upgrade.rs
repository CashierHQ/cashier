use gate_service_types::auth::Permission;

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn should_init_with_gate_creator_permissions_for_cashier_backend() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::GateServiceBackendAdmin.get_principal();
        let admin_client = ctx.new_gate_service_backend_client(admin);

        // Act
        let permissions = admin_client
            .admin_permissions_get(ctx.cashier_backend_principal)
            .await
            .unwrap();

        // Assert
        assert_eq!(vec![Permission::GateCreator], permissions);

        Ok(())
    })
    .await
    .unwrap();
}
