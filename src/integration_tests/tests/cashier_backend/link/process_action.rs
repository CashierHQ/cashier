use super::fixtures::CreateLinkTestFixture;
use crate::utils::{
    icrc_112::execute_icrc112_request, principal::get_user_principal, with_pocket_ic_context,
};

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

        assert!(processeing_action.icrc_112_requests.is_some());

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

        let icrc_112_requests = processeing_action.icrc_112_requests.as_ref().unwrap();

        let execution_result = execute_icrc112_request(icrc_112_requests, caller, ctx).await;

        assert!(
            execution_result.is_ok(),
            "ICRC112 execution failed: {:?}",
            execution_result.err()
        );

        fixture.update_action().await;

        let updated_action = fixture.get_action();

        assert_eq!(updated_action.state, "Action_state_success".to_string());
        assert_eq!(updated_action.intents.len(), 2);
        assert!(updated_action
            .intents
            .iter()
            .all(|intent| { intent.state == "Intent_state_success" }));

        Ok(())
    })
    .await
    .unwrap();
}
