use std::sync::Arc;

use crate::cashier_backend::link_v2::send_tip::fixture::TipLinkV2Fixture;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::Nat;
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::link_v2::dto::{ProcessActionDto, ProcessActionV2Input};
use cashier_backend_types::repository::action::v1::ActionType;
use cashier_backend_types::{constant, error::CanisterError};

#[tokio::test]
async fn test_request_lock_for_process_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();

        // Setup user and create link v2
        let mut creator_fixture = TipLinkV2Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            constant::ICP_TOKEN,
            Nat::from(100_000_000u64),
        )
        .await;

        let dto = creator_fixture.activate_link().await;

        let create_action_input = CreateActionInput {
            link_id: dto.link.id.clone(),
            action_type: ActionType::Receive,
        };
        let receive_action = creator_fixture
            .link_fixture
            .create_action_v2(create_action_input)
            .await
            .unwrap();

        // Act - submit 3 create_action calls concurrently
        let mut msgs: Vec<ic_mple_pocket_ic::pocket_ic::common::rest::RawMessageId> =
            Vec::with_capacity(3);
        for _ in 0..3 {
            msgs.push(
                creator_fixture
                    .link_fixture
                    .cashier_backend_client
                    .as_ref()
                    .unwrap()
                    .submit_process_action_v2(ProcessActionV2Input {
                        action_id: receive_action.id.clone(),
                    })
                    .await
                    .unwrap(),
            );
        }

        let mut results: Vec<Result<ProcessActionDto, CanisterError>> = Vec::with_capacity(3);
        for msg in msgs {
            results.push(
                creator_fixture
                    .link_fixture
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
