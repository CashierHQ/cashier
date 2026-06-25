use cashier_backend_types::settings::UpdateSettingArgs;

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn should_enable_and_disable_inspect_message() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        // Act
        let before = admin_client.is_inspect_message_enabled().await.unwrap();
        admin_client
            .admin_inspect_message_enable(false)
            .await
            .unwrap()
            .unwrap();
        let after = admin_client.is_inspect_message_enabled().await.unwrap();

        // Assert
        assert!(before);
        assert!(!after);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn inspect_message_should_intercept_admin_calls() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        // Act
        let result = user_client.admin_inspect_message_enable(false).await;

        // Assert
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("Call rejected by inspect check")
        );
        Ok(())
    })
    .await
    .unwrap();
}

/// `admin_update_setting` applies `inspect_message_enabled` without touching the canister ids.
#[tokio::test]
async fn should_update_inspect_message_enabled_via_admin_update_setting() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: admin client + baseline snapshot (inspect is enabled by default).
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let before = admin_client.admin_get_setting().await.unwrap();
        assert!(before.inspect_message_enabled);

        // Act: disable the inspect message only (canister ids omitted).
        admin_client
            .admin_update_setting(UpdateSettingArgs {
                inspect_message_enabled: Some(false),
                token_storage_canister_id: None,
                gate_service_canister_id: None,
            })
            .await
            .unwrap()
            .unwrap();

        // Assert: flag flipped; both canister ids untouched.
        let after = admin_client.admin_get_setting().await.unwrap();
        assert!(!after.inspect_message_enabled);
        assert_eq!(
            after.token_storage_canister_id,
            before.token_storage_canister_id
        );
        assert_eq!(
            after.gate_service_canister_id,
            before.gate_service_canister_id
        );

        Ok(())
    })
    .await
    .unwrap();
}
