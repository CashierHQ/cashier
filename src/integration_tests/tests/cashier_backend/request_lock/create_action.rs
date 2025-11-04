use crate::utils::principal::TestUser;
use crate::{cashier_backend::link::fixture::LinkTestFixture, utils::with_pocket_ic_context};
use candid::Nat;
use cashier_backend_types::repository::action::v1::ActionType;
use cashier_backend_types::{
    constant,
    dto::action::{ActionDto, CreateActionInput},
    error::CanisterError,
};
use std::sync::Arc;

#[tokio::test]
async fn test_request_lock_for_create_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        // Setup user and create link
        let link = fixture
            .create_tip_link(constant::ICP_TOKEN, Nat::from(100_000_000u64))
            .await;

        // Act - submit 3 create_action calls concurrently
        let mut msgs = Vec::with_capacity(3);
        for _ in 0..3 {
            msgs.push(
                fixture
                    .cashier_backend_client
                    .as_ref()
                    .unwrap()
                    .submit_create_action(CreateActionInput {
                        link_id: link.id.to_string(),
                        action_type: ActionType::CreateLink,
                    })
                    .await
                    .unwrap(),
            );
        }

        let mut results: Vec<Result<ActionDto, CanisterError>> = Vec::with_capacity(3);
        for msg in msgs {
            results.push(
                fixture
                    .cashier_backend_client
                    .as_ref()
                    .unwrap()
                    .await_call(msg)
                    .await
                    .unwrap(),
            );
        }

        // Assert - exactly 1 of 3 should succeed
        let success_count = results.iter().filter(|r| r.is_ok()).count();
        assert_eq!(success_count, 1, "Expected exactly 1 action to succeed");

        // Assert failed actions contain expected error message
        let failed_actions = results.iter().filter(|r| r.is_err()).collect::<Vec<_>>();

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
