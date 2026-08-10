use std::sync::Arc;

use crate::cashier_backend::link_v3::send_tip::fixture::TipLinkV3Fixture;
use crate::constant::ICP_TOKEN;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::Nat;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v3::dto::action::{
    CreateActionInputV3, ProcessActionInputV3, ProcessActionResponseV3,
};

#[tokio::test]
async fn test_request_lock_for_process_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap_or_default();

        // Setup user and create link v3
        let mut creator_fixture = TipLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            ICP_TOKEN,
            Nat::from(100_000_000u64),
            icp_ledger_fee.clone(),
            icp_ledger_fee,
        )
        .await;

        let activate_result = creator_fixture.activate_link().await;
        let link_id = activate_result.link.id.clone();

        let create_action_input = CreateActionInputV3 {
            link_id: link_id.clone(),
            action: creator_fixture.link_fixture.receive_action(link_id, caller),
        };
        let receive_action = creator_fixture
            .link_fixture
            .create_action_v3(create_action_input)
            .await
            .unwrap();

        // Act - submit 3 process_action calls concurrently
        let mut msgs: Vec<ic_mple_pocket_ic::pocket_ic::common::rest::RawMessageId> =
            Vec::with_capacity(3);
        for _ in 0..3 {
            msgs.push(
                creator_fixture
                    .link_fixture
                    .cashier_backend_client
                    .as_ref()
                    .unwrap()
                    .submit_process_action_v3(ProcessActionInputV3 {
                        action_id: receive_action.action.id.clone(),
                    })
                    .await
                    .unwrap(),
            );
        }

        let mut results: Vec<Result<ProcessActionResponseV3, CanisterError>> =
            Vec::with_capacity(3);
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
