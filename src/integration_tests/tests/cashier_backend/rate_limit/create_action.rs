use std::sync::Arc;
use std::time::Duration;

use cashier_backend_types::{
    dto::{
        action::{ActionDto, CreateActionInput},
        link::LinkDto,
    },
    error::CanisterError,
};

use crate::utils::principal::TestUser;
use crate::{cashier_backend::link::fixture::LinkTestFixture, utils::PocketIcTestContextBuilder};
use cashier_backend_types::constant;

#[tokio::test]
async fn it_should_handle_rate_limit_for_create_action() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .build_async()
        .await;
    let arc_ctx = Arc::new(ctx);
    let caller = TestUser::User1.get_principal();
    let fixture = LinkTestFixture::new(arc_ctx.clone(), &caller).await;

    // Setup user and create link
    fixture.setup_user().await;

    // Create 11 links
    let mut links: Vec<LinkDto> = Vec::with_capacity(11);
    for _ in 0..11 {
        arc_ctx.advance_time(Duration::from_secs(60 * 5)).await;
        let res = fixture
            .create_tip_link(constant::ICP_TOKEN, 100_000_000u64)
            .await;
        links.push(res);
    }

    // Act - submit 11 create_action calls rapidly (rate limit is 10 per 5 minutes)
    let mut results: Vec<Result<ActionDto, CanisterError>> = Vec::with_capacity(11);
    for link in links.iter() {
        let result = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .create_action(CreateActionInput {
                link_id: link.id.to_string(),
                action_type: "CreateLink".to_string(), // Different action types to avoid duplicate action errors
            })
            .await
            .unwrap();
        results.push(result);
    }

    // Assert - first 10 should succeed, 11th should fail with rate limit error
    let success_count = results.iter().filter(|r| r.is_ok()).count();
    let failed_results = results.iter().filter(|r| r.is_err()).collect::<Vec<_>>();

    assert_eq!(success_count, 10, "Expected exactly 10 actions to succeed");
    assert_eq!(failed_results.len(), 1, "Expected exactly 1 action to fail");

    // Assert the failed action contains rate limit error message
    if let Some(Err(error)) = failed_results.first() {
        assert!(
            error.to_string().contains(
                "Rate limit error: Insufficient capacity: tried to acquire 1, available 0, "
            ),
            "Expected error to contain 'RateLimitError', got: {error}"
        );
    } else {
        panic!("Expected at least one failed action");
    }
}

#[tokio::test]
async fn it_should_handle_rate_limit_for_different_users() {
    // Arrange - Setup two different users
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .build_async()
        .await;
    let arc_ctx = Arc::new(ctx);
    let caller1 = TestUser::User1.get_principal();
    let caller2 = TestUser::User2.get_principal();

    let fixture1 = LinkTestFixture::new(arc_ctx.clone(), &caller1).await;
    let fixture2 = LinkTestFixture::new(arc_ctx.clone(), &caller2).await;

    // Setup both users and create links
    fixture1.setup_user().await;
    fixture2.setup_user().await;

    let mut links_caller1: Vec<LinkDto> = Vec::with_capacity(10);
    let mut links_caller2: Vec<LinkDto> = Vec::with_capacity(10);

    for _ in 0..10 {
        arc_ctx.advance_time(Duration::from_secs(60 * 5)).await;
        let link1 = fixture1
            .create_tip_link(constant::ICP_TOKEN, 100_000_000u64)
            .await;
        links_caller1.push(link1);
        let link2 = fixture2
            .create_tip_link(constant::ICP_TOKEN, 100_000_000u64)
            .await;
        links_caller2.push(link2);
    }

    // Act - Each user submits 10 create_action calls (should not interfere with each other)
    let mut results1: Vec<Result<ActionDto, CanisterError>> = Vec::with_capacity(10);
    let mut results2: Vec<Result<ActionDto, CanisterError>> = Vec::with_capacity(10);

    for link1 in links_caller1.iter() {
        let result1 = fixture1
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .create_action(CreateActionInput {
                link_id: link1.id.to_string(),
                action_type: "CreateLink".to_string(),
            })
            .await
            .unwrap();
        results1.push(result1);
    }
    for link2 in links_caller2.iter() {
        let result2 = fixture2
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .create_action(CreateActionInput {
                link_id: link2.id.to_string(),
                action_type: "CreateLink".to_string(),
            })
            .await
            .unwrap();
        results2.push(result2);
    }

    // Assert - Both users should be able to perform 10 actions each
    let success_count1 = results1.iter().filter(|r| r.is_ok()).count();
    let success_count2 = results2.iter().filter(|r| r.is_ok()).count();

    assert_eq!(
        success_count1, 10,
        "User1 should be able to perform 10 actions"
    );
    assert_eq!(
        success_count2, 10,
        "User2 should be able to perform 10 actions"
    );
}

#[tokio::test]
async fn it_should_resset_counter_after_10_minutes() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .build_async()
        .await;
    let arc_ctx = Arc::new(ctx);
    let caller = TestUser::User1.get_principal();
    let fixture = LinkTestFixture::new(arc_ctx.clone(), &caller).await;

    // Setup user and create link
    fixture.setup_user().await;

    // Create 11 links
    let mut links: Vec<LinkDto> = Vec::with_capacity(11);
    for _ in 0..11 {
        arc_ctx.advance_time(Duration::from_secs(60 * 5)).await;
        let res = fixture
            .create_tip_link(constant::ICP_TOKEN, 100_000_000u64)
            .await;
        links.push(res);
    }

    // Act - submit 11 create_action calls rapidly (rate limit is 10 per 5 minutes)
    let mut results: Vec<Result<ActionDto, CanisterError>> = Vec::with_capacity(11);
    for link in links.iter() {
        let result = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .create_action(CreateActionInput {
                link_id: link.id.to_string(),
                action_type: "CreateLink".to_string(), // Different action types to avoid duplicate action errors
            })
            .await
            .unwrap();
        results.push(result);
    }

    // Assert - first 10 should succeed, 11th should fail with rate limit error
    let success_count = results.iter().filter(|r| r.is_ok()).count();
    let failed_results = results.iter().filter(|r| r.is_err()).collect::<Vec<_>>();

    assert_eq!(success_count, 10, "Expected exactly 10 actions to succeed");
    assert_eq!(failed_results.len(), 1, "Expected exactly 1 action to fail");

    // Assert the failed action contains rate limit error message
    if let Some(Err(error)) = failed_results.first() {
        assert!(
            error.to_string().contains(
                "Rate limit error: Insufficient capacity: tried to acquire 1, available 0, "
            ),
            "Expected error to contain 'RateLimitError', got: {error}"
        );
    } else {
        panic!("Expected at least one failed action");
    }

    // Act - wait for 10 minutes to reset the counter
    arc_ctx.advance_time(Duration::from_secs(60 * 10)).await;
    // Now try to create another action
    let new_link = fixture
        .create_tip_link(constant::ICP_TOKEN, 100_000_000u64)
        .await;
    let result_after_reset = fixture
        .cashier_backend_client
        .as_ref()
        .unwrap()
        .create_action(CreateActionInput {
            link_id: new_link.id.to_string(),
            action_type: "CreateLink".to_string(),
        })
        .await
        .unwrap();

    // Assert - the new action should succeed after the reset
    assert!(
        result_after_reset.is_ok(),
        "Expected the action to succeed after reset"
    );
}
