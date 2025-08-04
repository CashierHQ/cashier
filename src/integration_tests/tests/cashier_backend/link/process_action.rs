use super::fixtures::CreateLinkTestFixture;
use crate::utils::{principal::get_user_principal, with_pocket_ic_context};

#[tokio::test]
async fn should_process_action_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let cashier_backend_client = ctx.new_cashier_backend_client(caller);
        let mut fixture = CreateLinkTestFixture::new(cashier_backend_client);

        fixture
            .setup_environment(ctx)
            .await
            .create_link()
            .await
            .create_action()
            .await;

        let original_action = fixture.get_action().clone();

        fixture.process_action().await;

        let processeing_action = fixture.get_action();

        assert_eq!(processeing_action.id, original_action.id);
        assert_eq!(processeing_action.r#type, "CreateLink".to_string());
        assert_eq!(
            processeing_action.state,
            "Action_state_processing".to_string()
        );
        assert_eq!(processeing_action.creator, fixture.user.id);
        assert_eq!(processeing_action.intents.len(), 2);
        assert!(processeing_action
            .intents
            .iter()
            .all(|intent| { intent.state == "Intent_state_processing" }));

        Ok(())
    })
    .await
    .unwrap();
}
