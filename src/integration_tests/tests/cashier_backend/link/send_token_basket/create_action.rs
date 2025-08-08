use cashier_types::repository::{
    action::v1::{ActionState, ActionType},
    intent::v2::IntentState,
};

use super::super::fixture::LinkTestFixture;
use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn should_create_token_basket_action_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(ctx, &caller).await;
        let user = fixture.setup_user().await;

        // Act
        let link = fixture.create_token_basket_link(ctx).await;
        let action = fixture.create_action(&link.id).await;

        // Assert
        assert_eq!(action.r#type, ActionType::CreateLink.to_str());
        assert_eq!(action.state, ActionState::Created.to_str());
        assert_eq!(action.creator, user.id);
        assert_eq!(action.intents.len(), 4);
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
