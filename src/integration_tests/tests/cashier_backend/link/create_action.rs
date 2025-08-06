use super::context::CreateLinkTestContext;
use crate::utils::{principal::get_user_principal, with_pocket_ic_context};

#[tokio::test]
async fn should_create_action_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let mut context = CreateLinkTestContext::new();
        context.setup(ctx, &caller).await;

        context.create_link().await;
        context.create_action().await;

        let action = context.action.as_ref().unwrap();

        assert_eq!(action.r#type, "CreateLink".to_string());
        assert_eq!(action.state, "Action_state_created".to_string());
        assert_eq!(action.creator, context.user.as_ref().unwrap().id);
        assert_eq!(action.intents.len(), 2);
        assert!(action
            .intents
            .iter()
            .all(|intent| { intent.state == "Intent_state_created" }));
        assert!(!action.id.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}
