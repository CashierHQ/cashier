use super::fixtures::CreateLinkTestFixture;
use crate::utils::{principal::get_user_principal, with_pocket_ic_context};

#[tokio::test]
async fn should_create_action_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let cashier_backend_client = ctx.new_cashier_backend_client(caller);
        let mut fixture = CreateLinkTestFixture::new(cashier_backend_client);

        // Setup environment and create link first
        fixture.setup_environment(ctx).await.create_link().await;

        // Create action
        fixture.create_action().await;

        let action = fixture.get_action();

        // Verify action was created successfully
        assert_eq!(action.r#type, "CreateLink".to_string());
        assert_eq!(action.state, "Action_state_created".to_string());
        assert_eq!(action.creator, fixture.user.id);
        assert_eq!(action.intents.len(), 2);
        for intent in &action.intents {
            assert_eq!(intent.state, "Intent_state_created".to_string());
        }
        assert!(!action.id.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}
