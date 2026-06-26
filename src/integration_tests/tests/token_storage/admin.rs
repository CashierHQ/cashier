use candid::Principal;
use token_storage_types::{auth::Permission, settings::UpdateSettingArgs};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn should_allow_admin_to_get_permissions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);

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
        let user_client = ctx.new_token_storage_client(user);

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
async fn should_allow_admin_to_set_and_remove_permissions() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let user = TestUser::User1.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);

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
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_token_storage_client(user);

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

/// Non-admin callers cannot update or read settings.
#[tokio::test]
async fn should_not_allow_non_admin_to_update_or_get_setting() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: a non-admin user and its client.
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_token_storage_client(user);

        // Act: attempt to update and read settings as the non-admin user.
        let update_result = user_client
            .admin_update_setting(UpdateSettingArgs::default())
            .await;
        let get_result = user_client.admin_get_setting().await;

        // Assert: both calls are rejected.
        assert!(update_result.is_err());
        assert!(get_result.is_err());

        Ok(())
    })
    .await
    .unwrap();
}

/// Partial update: a single `Some` field is applied; all omitted (`None`) fields stay unchanged.
#[tokio::test]
async fn should_apply_partial_update_leaving_other_fields_untouched() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: baseline snapshot + a new distinct ckbtc id (precondition: it differs).
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);
        let before = admin_client.admin_get_setting().await.unwrap();
        let new_ckbtc = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        assert_ne!(before.ckbtc_minter_id, new_ckbtc);

        // Act: update ONLY ckbtc id (omnity + inspect omitted).
        admin_client
            .admin_update_setting(UpdateSettingArgs {
                inspect_message_enabled: None,
                ckbtc_minter_id: Some(new_ckbtc),
                omnity_bitcoin_id: None,
            })
            .await
            .unwrap()
            .unwrap();

        // Assert: ckbtc changed; omnity id and inspect flag preserved.
        let after = admin_client.admin_get_setting().await.unwrap();
        assert_eq!(after.ckbtc_minter_id, new_ckbtc);
        assert_eq!(after.omnity_bitcoin_id, before.omnity_bitcoin_id);
        assert_eq!(
            after.inspect_message_enabled,
            before.inspect_message_enabled
        );

        Ok(())
    })
    .await
    .unwrap();
}
