use super::fixtures::CreateLinkTestFixture;
use crate::utils::{principal::get_user_principal, with_pocket_ic_context};

#[tokio::test]
async fn should_process_action_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let cashier_backend_client = ctx.new_cashier_backend_client(caller);
        let mut fixture = CreateLinkTestFixture::new(cashier_backend_client);

        // Setup environment, create link, and create action
        fixture
            .setup_environment(ctx)
            .await
            .create_link()
            .await
            .create_action()
            .await;

        // Store the original action state for comparison
        let original_action = fixture.get_action().clone();

        // Process the action
        fixture.process_action().await;

        let processed_action = fixture.get_action();

        // Verify action was processed successfully
        assert_eq!(processed_action.r#type, "CreateLink".to_string());
        assert_eq!(
            processed_action.state,
            "Action_state_processing".to_string()
        );
        assert_eq!(processed_action.creator, fixture.user.id);
        assert_eq!(processed_action.intents.len(), 2);
        for intent in &processed_action.intents {
            assert_eq!(intent.state, "Intent_state_processing".to_string());
        }
        assert_eq!(processed_action.id, original_action.id);

        Ok(())
    })
    .await
    .unwrap();
}
