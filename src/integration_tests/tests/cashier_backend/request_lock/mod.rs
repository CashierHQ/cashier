use cashier_types::{
    dto::action::{ActionDto, CreateActionInput},
    error::CanisterError,
};

use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn test_request_lock_for_create_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        // Setup user and create link
        fixture.setup_user().await;
        let link = fixture.create_tip_link(ctx, 100_000_000u64).await;

        // Helper function to create action without unwrapping
        async fn create_action_safe(
            fixture: &LinkTestFixture,
            link_id: &str,
        ) -> Result<ActionDto, CanisterError> {
            fixture
                .cashier_backend_client
                .as_ref()
                .unwrap()
                .create_action(CreateActionInput {
                    link_id: link_id.to_string(),
                    action_type: "CreateLink".to_string(),
                })
                .await
                .unwrap()
        }

        // Act - submit 3 create_action calls concurrently
        let action_future_1 = create_action_safe(&fixture, &link.id);
        let action_future_2 = create_action_safe(&fixture, &link.id);
        let action_future_3 = create_action_safe(&fixture, &link.id);

        // Await all results
        let (action_1, action_2, action_3) =
            tokio::join!(action_future_1, action_future_2, action_future_3);

        println!("action_1: {action_1:?}");
        println!("action_2: {action_2:?}");
        println!("action_3: {action_3:?}");

        // Assert - exactly 1 of 3 should succeed
        let success_count = [&action_1, &action_2, &action_3]
            .iter()
            .filter(|result| result.is_ok())
            .count();
        assert_eq!(success_count, 1, "Expected exactly 1 action to succeed");

        // Assert failed actions contain expected error message
        let actions = [&action_1, &action_2, &action_3];
        let failed_actions = actions
            .iter()
            .filter(|result| result.is_err())
            .collect::<Vec<_>>();

        for failed_action in failed_actions {
            if let Err(error) = failed_action {
                assert!(
                    error
                        .to_string()
                        .contains("Request lock already exists for key:"),
                    "Expected error to contain 'Request lock already exists for key:', got: {error}"
                );
            }
        }

        Ok(())
    })
    .await
    .unwrap()
}
