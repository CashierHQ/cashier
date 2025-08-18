use cashier_backend_types::repository::{
    action::v1::{ActionState, ActionType},
    intent::v2::IntentState,
};

use super::super::fixture::LinkTestFixture;
use crate::utils::{principal::TestUser, with_pocket_ic_context};
use std::sync::Arc;

#[tokio::test]
async fn should_create_send_tip_action_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;
        let user = fixture.setup_user().await;
        let link = fixture.create_tip_link(100_000_000u64).await;

        // Act
        let action = fixture.create_action(&link.id, "CreateLink").await;

        // Assert
        assert_eq!(action.r#type, ActionType::CreateLink.to_str());
        assert_eq!(action.state, ActionState::Created.to_str());
        assert_eq!(action.creator, user.id);
        assert_eq!(action.intents.len(), 2);
        assert!(
            action
                .intents
                .iter()
                .all(|intent| { intent.state == IntentState::Created.to_str() })
        );
        assert!(!action.id.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}
