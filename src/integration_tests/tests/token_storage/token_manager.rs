// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::{
    auth::Permission,
    token::{ChainTokenDetails, IcrcStandard, UpdateTokenStandardsInput},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

/// Test fixture for TokenManager permission setup
struct TokenManagerFixture {
    admin: candid::Principal,
    token_manager: candid::Principal,
}

impl TokenManagerFixture {
    /// Creates a new fixture with admin granting TokenManager permission to another principal
    async fn new(ctx: &crate::utils::PocketIcTestContext) -> Self {
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let token_manager = TestUser::User1.get_principal();

        let admin_client = ctx.new_token_storage_client(admin);

        // Grant TokenManager permission to User1
        admin_client
            .admin_permissions_add(token_manager, vec![Permission::TokenManager])
            .await
            .unwrap()
            .unwrap();

        Self {
            admin,
            token_manager,
        }
    }
}

/// Test: Admin can update token standards
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
            .token_manager_update_token_standards(input)
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

/// Test: TokenManager can update token standards
#[tokio::test]
async fn should_allow_token_manager_to_update_token_standards() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let fixture = TokenManagerFixture::new(ctx).await;
        let token_manager_client = ctx.new_token_storage_client(fixture.token_manager);

        // Get ICP token from registry
        let tokens = token_manager_client.list_tokens().await.unwrap().unwrap();
        let icp_token = tokens.tokens.iter().find(|t| t.symbol == "ICP").unwrap();
        let token_id = icp_token.id.clone();

        // Assert BEFORE: token should not have ICRC3
        assert!(!icp_token.details.supports_standard(&IcrcStandard::ICRC3));

        // Act: TokenManager updates standards
        let input = UpdateTokenStandardsInput {
            token_id: token_id.clone(),
            supported_standards: vec![
                IcrcStandard::ICRC1,
                IcrcStandard::ICRC2,
                IcrcStandard::ICRC3,
            ],
        };
        token_manager_client
            .token_manager_update_token_standards(input)
            .await
            .unwrap()
            .unwrap();

        // Assert AFTER: verify standards were updated
        let tokens_after = token_manager_client.list_tokens().await.unwrap().unwrap();
        let icp_after = tokens_after
            .tokens
            .iter()
            .find(|t| t.symbol == "ICP")
            .unwrap();

        assert!(icp_after.details.supports_standard(&IcrcStandard::ICRC3));

        Ok(())
    })
    .await
    .unwrap();
}

/// Test: User cannot update token standards
#[tokio::test]
async fn should_not_allow_user_to_update_token_standards() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);
        let user = TestUser::User2.get_principal();
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
        let result = user_client
            .token_manager_update_token_standards(input)
            .await;

        // Assert: should fail with NotAuthorized
        assert!(result.is_ok());
        let inner_result = result.unwrap();
        assert!(inner_result.is_err());
        assert!(inner_result.unwrap_err().to_string().contains("NotAuthorized"));

        Ok(())
    })
    .await
    .unwrap();
}

/// Test: Verify all 3 roles (Admin, TokenManager, User) have correct access
#[tokio::test]
async fn should_verify_three_role_access_control() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let fixture = TokenManagerFixture::new(ctx).await;
        let user = TestUser::User3.get_principal();
        let user_client = ctx.new_token_storage_client(user);

        let admin_client = ctx.new_token_storage_client(fixture.admin);
        let token_manager_client = ctx.new_token_storage_client(fixture.token_manager);

        // Disable inspect message for direct testing
        admin_client
            .admin_inspect_message_enable(false)
            .await
            .unwrap()
            .unwrap();

        // Get ICP token
        let tokens = admin_client.list_tokens().await.unwrap().unwrap();
        let icp_token = tokens.tokens.iter().find(|t| t.symbol == "ICP").unwrap();
        let token_id = icp_token.id.clone();

        let input = UpdateTokenStandardsInput {
            token_id: token_id.clone(),
            supported_standards: vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        };

        // Act & Assert: Admin can update
        let admin_result = admin_client
            .token_manager_update_token_standards(input.clone())
            .await;
        assert!(admin_result.is_ok());
        assert!(admin_result.unwrap().is_ok());

        // Act & Assert: TokenManager can update
        let token_manager_result = token_manager_client
            .token_manager_update_token_standards(input.clone())
            .await;
        assert!(token_manager_result.is_ok());
        assert!(token_manager_result.unwrap().is_ok());

        // Act & Assert: User cannot update
        let user_result = user_client
            .token_manager_update_token_standards(input)
            .await;
        assert!(user_result.is_ok());
        let inner_result = user_result.unwrap();
        assert!(inner_result.is_err());
        assert!(inner_result.unwrap_err().to_string().contains("NotAuthorized"));

        Ok(())
    })
    .await
    .unwrap();
}
