use gate_service_types::auth::Permission;

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn should_allow_admin_to_get_permissions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::GateServiceBackendAdmin.get_principal();
        let admin_client = ctx.new_gate_service_backend_client(admin);

        let permissions = admin_client.admin_permissions_get(admin).await.unwrap();

        // Assert
        assert_eq!(vec![Permission::Admin], permissions);

        Ok(())
    })
    .await
    .unwrap();
}
