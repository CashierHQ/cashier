use cashier_backend_types::{
    dto::action::{ActionDto, UpdateActionInput},
    error::CanisterError,
};

use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::utils::{
    icrc_112::execute_icrc112_request, principal::TestUser, with_pocket_ic_context,
};
use std::sync::Arc;

#[tokio::test]
async fn test_request_lock_for_update_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let mut fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        // Setup user and airdrop tokens
        fixture.setup_user().await;
        fixture
            .airdrop_icp(ctx, 1_000_000_000_000_000, &caller)
            .await;
        fixture
            .airdrop_icrc(ctx, "ckBTC", 1_000_000_000_000_000, &caller)
            .await;
        fixture
            .airdrop_icrc(ctx, "ckUSDC", 1_000_000_000_000_000, &caller)
            .await;

        // Create and process link to get ICRC-112 requests
        let link = fixture.create_token_basket_link(ctx).await;
        let action = fixture.create_action(&link.id, "CreateLink").await;
        let processing_action = fixture.process_action(&link.id, &action.id).await;

        // Execute all ICRC112 requests
        if let Some(reqs) = processing_action.icrc_112_requests.as_ref() {
            execute_icrc112_request(reqs, caller, ctx)
                .await
                .expect("ICRC-112 execution failed");
        }

        // Act: concurrently submit and then await 3 update_action calls
        let mut msgs = Vec::with_capacity(3);
        for _ in 0..3 {
            msgs.push(
                fixture
                    .cashier_backend_client
                    .as_ref()
                    .unwrap()
                    .submit_update_action(UpdateActionInput {
                        link_id: link.id.to_string(),
                        action_id: action.id.to_string(),
                        external: true,
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
        let success_count = results.iter().filter(|r| r.is_ok()).count();
        let failed = results.iter().filter(|r| r.is_err());

        // Assert: 1 action should succeed, 2 should fail
        assert_eq!(success_count, 1, "Expected exactly 1 action to succeed");
        for err in failed {
            if let Err(e) = err {
                assert!(
                    e.to_string()
                        .contains("Request lock already exists for key:"),
                    "Expected request-lock error, got: {e}"
                );
            }
        }

        Ok(())
    })
    .await
    .unwrap()
}
