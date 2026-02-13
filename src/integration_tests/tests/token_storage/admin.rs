use token_storage_types::{
    auth::Permission,
    token::{ChainTokenDetails, IcrcStandard, UpdateTokenStandardsInput},
};

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

#[tokio::test]
async fn should_allow_admin_to_update_token_standards() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);

        // Get ICP token from registry
        let tokens = admin_client.list_tokens().await.unwrap().unwrap();
        let icp_token = tokens.tokens.iter().find(|t| t.symbol == "ICP").unwrap();
        let token_id = icp_token.id.clone();

        // Assert BEFORE: token should have default standards (ICRC1 + ICRC2 from fixture)
        assert!(!icp_token.details.supports_standard(&IcrcStandard::ICRC3));

        // Act: update standards to include ICRC-3
        let input = UpdateTokenStandardsInput {
            token_id: token_id.clone(),
            supported_standards: vec![
                IcrcStandard::ICRC1,
                IcrcStandard::ICRC2,
                IcrcStandard::ICRC3,
            ],
        };
        admin_client
            .admin_update_token_standards(input)
            .await
            .unwrap()
            .unwrap();

        // Assert AFTER: re-fetch and verify standards changed
        let tokens_after = admin_client.list_tokens().await.unwrap().unwrap();
        let icp_after = tokens_after
            .tokens
            .iter()
            .find(|t| t.symbol == "ICP")
            .unwrap();

        // Verify the new standards are exactly what we set
        match &icp_after.details {
            ChainTokenDetails::IC {
                supported_standards,
                ..
            } => {
                assert_eq!(
                    supported_standards,
                    &vec![
                        IcrcStandard::ICRC1,
                        IcrcStandard::ICRC2,
                        IcrcStandard::ICRC3
                    ]
                );
            }
        }

        // Verify helper methods work correctly on updated token
        assert!(icp_after.details.supports_icrc2());
        assert!(icp_after.details.supports_standard(&IcrcStandard::ICRC3));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_not_allow_user_to_update_token_standards() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);
        let user = TestUser::User1.get_principal();
        let user_client = ctx.new_token_storage_client(user);

        // Disable inspect message to test direct endpoint behavior
        admin_client
            .admin_inspect_message_enable(false)
            .await
            .unwrap()
            .unwrap();

        // Get ICP token
        let tokens = admin_client.list_tokens().await.unwrap().unwrap();
        let icp_token = tokens.tokens.iter().find(|t| t.symbol == "ICP").unwrap();

        // Act: user tries to update standards
        let input = UpdateTokenStandardsInput {
            token_id: icp_token.id.clone(),
            supported_standards: vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        };
        let result = user_client.admin_update_token_standards(input).await;

        // Assert: should fail with NotAuthorized
        assert!(result.unwrap_err().to_string().contains("NotAuthorized"));

        Ok(())
    })
    .await
    .unwrap();
}
