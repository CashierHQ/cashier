use cashier_types::{
    dto::action::{ActionDto, CreateActionInput},
    error::CanisterError,
};

use crate::utils::principal::TestUser;
use crate::{cashier_backend::link::fixture::LinkTestFixture, utils::with_pocket_ic_context};

use std::time::Duration;

#[tokio::test]
async fn test_request_lock_for_create_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        // Setup user and create link
        fixture.setup_user().await;
        let link = fixture.create_tip_link(ctx, 100_000_000u64).await;

        // Act - submit 3 create_action calls concurrently
        let msg_id_1 = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .submit_create_action(CreateActionInput {
                link_id: link.id.to_string(),
                action_type: "CreateLink".to_string(),
            })
            .await
            .unwrap();
        let msg_id_2 = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .submit_create_action(CreateActionInput {
                link_id: link.id.to_string(),
                action_type: "CreateLink".to_string(),
            })
            .await
            .unwrap();
        let msg_id_3 = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .submit_create_action(CreateActionInput {
                link_id: link.id.to_string(),
                action_type: "CreateLink".to_string(),
            })
            .await
            .unwrap();

        let res_1: Result<ActionDto, CanisterError> = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .await_call(msg_id_1)
            .await
            .unwrap();
        ctx.advance_time(Duration::from_millis(1)).await;
        let res_2: Result<ActionDto, CanisterError> = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .await_call(msg_id_2)
            .await
            .unwrap();
        ctx.advance_time(Duration::from_millis(1)).await;
        let res_3: Result<ActionDto, CanisterError> = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .await_call(msg_id_3)
            .await
            .unwrap();

        // Assert - exactly 1 of 3 should succeed
        let success_count = [&res_1, &res_2, &res_3]
            .iter()
            .filter(|result| result.is_ok())
            .count();
        assert_eq!(success_count, 1, "Expected exactly 1 action to succeed");

        // Assert failed actions contain expected error message
        let actions = [&res_1, &res_2, &res_3];
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
