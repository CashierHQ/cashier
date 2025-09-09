use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn should_enable_and_disable_inspect_message() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);

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
        let user_client = ctx.new_token_storage_client(user);

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
