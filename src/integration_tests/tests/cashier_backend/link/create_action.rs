use super::fixture::LinkTestFixture;
use crate::utils::{principal::get_user_principal, with_pocket_ic_context};

#[tokio::test]
async fn should_create_action_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        let user = fixture.setup_user().await;

        let link = fixture.create_tip_link(ctx).await;
        let action = fixture.create_action(&link.id).await;

        assert_eq!(action.r#type, "CreateLink".to_string());
        assert_eq!(action.state, "Action_state_created".to_string());
        assert_eq!(action.creator, user.id);
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
