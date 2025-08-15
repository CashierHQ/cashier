use std::time::Duration;

use cashier_backend_types::{
    dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput, LinkDto},
    error::CanisterError,
    repository::link::v1::LinkType,
};

use crate::utils::principal::TestUser;
use crate::{cashier_backend::link::fixture::LinkTestFixture, utils::with_pocket_ic_context};

#[tokio::test]
async fn it_should_handle_rate_limit_for_create_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        // Setup user
        fixture.setup_user().await;

        // Act - submit 11 create_link calls rapidly (rate limit is 10 per 10 minutes)
        let mut results: Vec<Result<LinkDto, CanisterError>> = Vec::with_capacity(11);
        for i in 0..11 {
            let result = fixture
                .cashier_backend_client
                .as_ref()
                .unwrap()
                .create_link(CreateLinkInput {
                    title: format!("Test Link {}", i),
                    link_use_action_max_count: 1,
                    asset_info: vec![LinkDetailUpdateAssetInfoInput {
                        address: ctx.icp_ledger_principal.to_string(),
                        chain: "IC".to_string(),
                        label: "SEND_TIP_ASSET".to_string(),
                        amount_per_link_use_action: 100_000_000,
                    }],
                    template: "Central".to_string(),
                    link_type: LinkType::SendTip.to_str().to_string(),
                    nft_image: None,
                    link_image_url: None,
                    description: Some(format!("Test link description {}", i)),
                })
                .await
                .unwrap();
            results.push(result);
        }

        // Assert - first 10 should succeed, 11th should fail with rate limit error
        let success_count = results.iter().filter(|r| r.is_ok()).count();
        let failed_results = results.iter().filter(|r| r.is_err()).collect::<Vec<_>>();

        assert_eq!(success_count, 10, "Expected exactly 10 links to succeed");
        assert_eq!(failed_results.len(), 1, "Expected exactly 1 link to fail");

        // Assert the failed link contains rate limit error message
        if let Some(Err(error)) = failed_results.first() {
            assert!(
                error.to_string().contains("Rate limit error: Insufficient capacity: tried to acquire 1, available 0, retry after "),
                "Expected error to contain 'RateLimitError', got: {error}"
            );
        } else {
            panic!("Expected at least one failed link creation");
        }

        Ok(())
    })
    .await
    .unwrap()
}

#[tokio::test]
async fn it_should_handle_rate_limit_for_different_users() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange - Setup two different users
        let caller1 = TestUser::User1.get_principal();
        let caller2 = TestUser::User2.get_principal();

        let fixture1 = LinkTestFixture::new(ctx, &caller1).await;
        let fixture2 = LinkTestFixture::new(ctx, &caller2).await;

        // Setup both users and airdrop tokens
        fixture1.setup_user().await;
        fixture2.setup_user().await;

        // No need to airdrop for rate limit testing

        // Act - Each user submits 10 create_link calls (should not interfere with each other)
        let mut results1: Vec<Result<LinkDto, CanisterError>> = Vec::with_capacity(10);
        let mut results2: Vec<Result<LinkDto, CanisterError>> = Vec::with_capacity(10);

        for i in 0..10 {
            let result1 = fixture1
                .cashier_backend_client
                .as_ref()
                .unwrap()
                .create_link(CreateLinkInput {
                    title: format!("User1 Test Link {i}"),
                    link_use_action_max_count: 1,
                    asset_info: vec![LinkDetailUpdateAssetInfoInput {
                        address: ctx.icp_ledger_principal.to_string(),
                        chain: "IC".to_string(),
                        label: "SEND_TIP_ASSET".to_string(),
                        amount_per_link_use_action: 100_000_000,
                    }],
                    template: "Central".to_string(),
                    link_type: LinkType::SendTip.to_str().to_string(),
                    nft_image: None,
                    link_image_url: None,
                    description: Some(format!("User1 test link description {i}")),
                })
                .await
                .unwrap();
            results1.push(result1);

            let result2 = fixture2
                .cashier_backend_client
                .as_ref()
                .unwrap()
                .create_link(CreateLinkInput {
                    title: format!("User2 Test Link {i}"),
                    link_use_action_max_count: 1,
                    asset_info: vec![LinkDetailUpdateAssetInfoInput {
                        address: ctx.icp_ledger_principal.to_string(),
                        chain: "IC".to_string(),
                        label: "SEND_TIP_ASSET".to_string(),
                        amount_per_link_use_action: 100_000_000,
                    }],
                    template: "Central".to_string(),
                    link_type: LinkType::SendTip.to_str().to_string(),
                    nft_image: None,
                    link_image_url: None,
                    description: Some(format!("User2 test link description {i}")),
                })
                .await
                .unwrap();
            results2.push(result2);
        }

        // Assert - Both users should be able to create 10 links each
        let success_count1 = results1.iter().filter(|r| r.is_ok()).count();
        let success_count2 = results2.iter().filter(|r| r.is_ok()).count();

        assert_eq!(
            success_count1, 10,
            "User1 should be able to create 10 links"
        );
        assert_eq!(
            success_count2, 10,
            "User2 should be able to create 10 links"
        );

        Ok(())
    })
    .await
    .unwrap()
}

#[tokio::test]
async fn it_should_handle_rate_limit_for_create_link_with_differnet_link_types() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        // Setup user
        fixture.setup_user().await;
        // No need to airdrop for rate limit testing

        // Act - Create different types of links to test rate limiting across all link types
        let link_types = [
            LinkType::SendTip,
            LinkType::SendTokenBasket,
            LinkType::ReceivePayment,
            LinkType::SendAirdrop,
        ];

        let mut results: Vec<Result<LinkDto, CanisterError>> = Vec::with_capacity(12);
        for (i, link_type) in link_types.iter().cycle().take(12).enumerate() {
            let result = fixture
                .cashier_backend_client
                .as_ref()
                .unwrap()
                .create_link(CreateLinkInput {
                    title: format!("Test Link {i} - {link_type:?}"),
                    link_use_action_max_count: 1,
                    asset_info: vec![LinkDetailUpdateAssetInfoInput {
                        address: ctx.icp_ledger_principal.to_string(),
                        chain: "IC".to_string(),
                        label: "TEST_ASSET".to_string(),
                        amount_per_link_use_action: 100_000_000,
                    }],
                    template: "Central".to_string(),
                    link_type: link_type.to_str().to_string(),
                    nft_image: None,
                    link_image_url: None,
                    description: Some(format!("Test link description {i} - {link_type:?}")),
                })
                .await
                .unwrap();
            results.push(result);
        }

        // Assert - first 10 should succeed regardless of type, last 2 should fail with rate limit error
        let success_count = results.iter().filter(|r| r.is_ok()).count();
        let failed_results = results.iter().filter(|r| r.is_err()).collect::<Vec<_>>();

        assert_eq!(success_count, 10, "Expected exactly 10 links to succeed");
        assert_eq!(failed_results.len(), 2, "Expected exactly 2 links to fail");

        // Assert the failed links contain rate limit error messages
        for failed_result in failed_results {
            if let Err(error) = failed_result {
                assert!(
                    error.to_string().contains("Rate limit error: Insufficient capacity: tried to acquire 1, available 0, retry after"),
                    "Expected error to contain 'RateLimitError', got: {error}"
                );
            }
        }

        Ok(())
    })
    .await
    .unwrap()
}

#[tokio::test]
async fn should_reset_counter_after_10_minutes() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        // Setup user
        fixture.setup_user().await;

        // Act - Create links sequentially until rate limited
        let mut success_count = 0;
        let mut rate_limited = false;

        for i in 0..11 {
            // Try more than the rate limit
            let result = fixture
                .cashier_backend_client
                .as_ref()
                .unwrap()
                .create_link(CreateLinkInput {
                    title: format!("Sequential Test Link {}", i),
                    link_use_action_max_count: 1,
                    asset_info: vec![LinkDetailUpdateAssetInfoInput {
                        address: ctx.icp_ledger_principal.to_string(),
                        chain: "IC".to_string(),
                        label: "SEND_TIP_ASSET".to_string(),
                        amount_per_link_use_action: 100_000_000,
                    }],
                    template: "Central".to_string(),
                    link_type: LinkType::SendTip.to_str().to_string(),
                    nft_image: None,
                    link_image_url: None,
                    description: Some(format!("Sequential test link description {}", i)),
                })
                .await
                .unwrap();

            match result {
                Ok(_) => success_count += 1,
                Err(error) => {
                    if error.to_string().contains("Rate limit error: Insufficient capacity: tried to acquire 1, available 0, retry after ") {
                        rate_limited = true;
                        break;
                    } else {
                        // Other errors might occur, but we expect rate limiting
                        panic!("Unexpected error: {}", error);
                    }
                }
            }
        }

        // Assert: Should create exactly 10 links then hit rate limit
        assert_eq!(
            success_count, 10,
            "Should create exactly 10 links before rate limiting"
        );
        assert!(rate_limited, "Should hit rate limit after 10 links");

        // Act - Wait for 10 minutes to reset the rate limit counter
        ctx.advance_time(Duration::from_secs(60 * 10)).await;

        // Try creating one more link after the reset
        let result_after_reset = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .create_link(CreateLinkInput {
                title: "Link After Reset".to_string(),
                link_use_action_max_count: 1,
                asset_info: vec![LinkDetailUpdateAssetInfoInput {
                    address: ctx.icp_ledger_principal.to_string(),
                    chain: "IC".to_string(),
                    label: "SEND_TIP_ASSET".to_string(),
                    amount_per_link_use_action: 100_000_000,
                }],
                template: "Central".to_string(),
                link_type: LinkType::SendTip.to_str().to_string(),
                nft_image: None,
                link_image_url: None,
                description: Some("Link created after rate limit reset".to_string()),
            })
            .await
            .unwrap();

        assert!(result_after_reset.is_ok(), "Should be able to create link after rate limit reset");

        Ok(())
    })
    .await
    .unwrap()
}
