use cashier_types::{
    dto::{
        action::{ActionDto, ProcessActionInput},
        link::UpdateLinkInput,
    },
    error::CanisterError,
    repository::link::v1::LinkState,
};

use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::utils::{
    icrc_112::execute_icrc112_request, principal::TestUser, with_pocket_ic_context,
};

#[tokio::test]
async fn test_request_lock_for_process_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let mut fixture = LinkTestFixture::new(ctx, &caller).await;

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

        // top up link and active link
        let active_link = {
            let link = fixture.create_token_basket_link(ctx).await;
            let action = fixture.create_action(&link.id, "CreateLink").await;
            let processing_action = fixture.process_action(&link.id, &action.id).await;
            let _icrc112_execution_result = execute_icrc112_request(
                processing_action.icrc_112_requests.as_ref().unwrap(),
                caller,
                ctx,
            )
            .await;
            let _ = fixture.update_action(&link.id, &action.id).await;
            fixture
                .update_link(UpdateLinkInput {
                    id: link.id.to_string(),
                    action: "Continue".to_string(),
                    params: None,
                })
                .await
        };
        let use_action = fixture.create_action(&active_link.id, "Use").await;

        // Act - submit call 3 times concurrently
        let msg_id_1 = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .submit_process_action(ProcessActionInput {
                link_id: active_link.id.to_string(),
                action_id: use_action.id.to_string(),
                action_type: "Use".to_string(),
            })
            .await
            .unwrap();
        let msg_id_2 = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .submit_process_action(ProcessActionInput {
                link_id: active_link.id.to_string(),
                action_id: use_action.id.to_string(),
                action_type: "Use".to_string(),
            })
            .await
            .unwrap();
        let msg_id_3 = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .submit_process_action(ProcessActionInput {
                link_id: active_link.id.to_string(),
                action_id: use_action.id.to_string(),
                action_type: "Use".to_string(),
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
        let res_2: Result<ActionDto, CanisterError> = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .await_call(msg_id_2)
            .await
            .unwrap();
        let res_3: Result<ActionDto, CanisterError> = fixture
            .cashier_backend_client
            .as_ref()
            .unwrap()
            .await_call(msg_id_3)
            .await
            .unwrap();

        let results = [res_1, res_2, res_3];

        let success_count = results.iter().filter(|r| r.is_ok()).count();

        let failed_actions = results.iter().filter(|r| r.is_err()).collect::<Vec<_>>();

        // Assert
        assert_eq!(active_link.state, LinkState::Active.to_str());

        assert_eq!(success_count, 1, "Expected exactly 1 action to succeed");

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
