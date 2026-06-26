use candid::Principal;
use cashier_backend_types::{auth::Permission, settings::UpdateSettingArgs};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn should_allow_admin_to_get_permissions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        let permissions = admin_client.admin_permissions_get(admin).await.unwrap();

        // Assert
        assert_eq!(vec![Permission::Admin], permissions);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_not_allow_user_to_get_permissions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        // Act
        let permissions = user_client.admin_permissions_get(user).await;

        // Assert
        assert!(permissions.is_err());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_admin_flush_token_standard_cache() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        // Act
        let result = admin_client.admin_flush_token_standard_cache().await;

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap().is_ok());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_allow_admin_to_set_and_remove_permissions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let user = TestUser::User1.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        // Act
        let user_permissions_add = admin_client
            .admin_permissions_add(user, vec![Permission::Admin])
            .await
            .unwrap()
            .unwrap();

        let user_permissions_get_1 = admin_client.admin_permissions_get(user).await.unwrap();

        let user_permissions_remove = admin_client
            .admin_permissions_remove(user, vec![Permission::Admin])
            .await
            .unwrap()
            .unwrap();

        let user_permissions_get_2 = admin_client.admin_permissions_get(user).await.unwrap();

        // Assert
        assert_eq!(vec![Permission::Admin], user_permissions_add);
        assert_eq!(vec![Permission::Admin], user_permissions_get_1);
        assert!(user_permissions_remove.is_empty());
        assert!(user_permissions_get_2.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_not_allow_user_to_set_and_remove_permissions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        // Disable the inspect message to test direct endpoint behavior
        admin_client
            .admin_inspect_message_enable(false)
            .await
            .unwrap()
            .unwrap();

        // Act
        let user_permissions_add = user_client
            .admin_permissions_add(user, vec![Permission::Admin])
            .await;

        let user_permissions_remove = user_client
            .admin_permissions_remove(user, vec![Permission::Admin])
            .await;

        // Assert
        assert!(
            user_permissions_add
                .unwrap_err()
                .to_string()
                .contains("NotAuthorized")
        );
        assert!(
            user_permissions_remove
                .unwrap_err()
                .to_string()
                .contains("NotAuthorized")
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_allow_admin_to_clear_all_fee_cache() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);

        // Act & Assert
        admin_client.admin_fee_cache_clear().await.unwrap().unwrap();

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_not_allow_user_to_clear_all_fee_cache() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        // Disable inspect message to test direct endpoint behavior
        admin_client
            .admin_inspect_message_enable(false)
            .await
            .unwrap()
            .unwrap();

        // Act
        let result = user_client.admin_fee_cache_clear().await;

        // Assert
        assert!(result.unwrap_err().to_string().contains("NotAuthorized"));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_allow_admin_to_clear_token_fee_cache() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let token_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(); // ICP ledger

        // Act & Assert
        admin_client
            .admin_fee_cache_clear_token(token_id)
            .await
            .unwrap()
            .unwrap();

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_not_allow_user_to_clear_token_fee_cache() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);
        let token_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        // Disable inspect message to test direct endpoint behavior
        admin_client
            .admin_inspect_message_enable(false)
            .await
            .unwrap()
            .unwrap();

        // Act
        let result = user_client.admin_fee_cache_clear_token(token_id).await;

        // Assert
        assert!(result.unwrap_err().to_string().contains("NotAuthorized"));

        Ok(())
    })
    .await
    .unwrap();
}

/// Non-admin callers cannot update settings (rejected at inspect ingress / in-method).
#[tokio::test]
async fn should_not_allow_non_admin_to_update_setting() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: a non-admin user and its client.
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        // Act: attempt to update settings as the non-admin user.
        let result = user_client
            .admin_update_setting(UpdateSettingArgs::default())
            .await;

        // Assert: the call is rejected (non-admin not allowed to write settings).
        assert!(result.is_err());

        Ok(())
    })
    .await
    .unwrap();
}

/// Non-admin callers cannot read settings either.
#[tokio::test]
async fn should_not_allow_non_admin_to_get_setting() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: a non-admin user and its client.
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_cashier_backend_client(user);

        // Act: attempt to read settings as the non-admin user.
        let result = user_client.admin_get_setting().await;

        // Assert: the call is rejected (non-admin not allowed to read settings).
        assert!(result.is_err());

        Ok(())
    })
    .await
    .unwrap();
}

/// Partial update: a single `Some` field is applied; all omitted (`None`) fields stay unchanged.
#[tokio::test]
async fn should_apply_partial_update_leaving_other_fields_untouched() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: baseline snapshot + a new distinct token_storage id (precondition: it differs).
        let admin = TestUser::CashierBackendAdmin.get_principal();
        let admin_client = ctx.new_cashier_backend_client(admin);
        let before = admin_client.admin_get_setting().await.unwrap();
        let new_ts = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        assert_ne!(before.token_storage_canister_id, new_ts);

        // Act: update ONLY token_storage id (gate + inspect omitted).
        admin_client
            .admin_update_setting(UpdateSettingArgs {
                inspect_message_enabled: None,
                token_storage_canister_id: Some(new_ts),
                gate_service_canister_id: None,
            })
            .await
            .unwrap()
            .unwrap();

        // Assert: ts changed; gate id and inspect flag preserved.
        let after = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(after.token_storage_canister_id, new_ts);
        assert_eq!(
            after.gate_service_canister_id,
            before.gate_service_canister_id
        );
        assert_eq!(
            after.inspect_message_enabled,
            before.inspect_message_enabled
        );

        Ok(())
    })
    .await
    .unwrap();
}
