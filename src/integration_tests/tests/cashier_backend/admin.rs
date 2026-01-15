use candid::Principal;
use cashier_backend_types::auth::Permission;

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

        // Act
        let result = admin_client.admin_fee_cache_clear().await.unwrap().unwrap();

        // Assert
        assert_eq!((), result);

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

        // Act
        let result = admin_client
            .admin_fee_cache_clear_token(token_id)
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!((), result);

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
