use super::context::CreateLinkTestContext;
use crate::utils::{
    icrc_112::execute_icrc112_request, principal::get_user_principal, with_pocket_ic_context,
};

#[tokio::test]
async fn should_process_action_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let mut context = CreateLinkTestContext::new();

        context
            .setup(ctx, &caller)
            .await
            .airdrop_icp(ctx, 1000000000)
            .await
            .create_link()
            .await
            .create_action()
            .await;

        let original_action = context.action.as_ref().unwrap().clone();

        context.process_action().await;

        let processing_action = context.action.as_ref().unwrap();

        assert!(processing_action.icrc_112_requests.is_some());

        assert_eq!(processing_action.id, original_action.id);
        assert_eq!(processing_action.r#type, "CreateLink".to_string());
        assert_eq!(
            processing_action.state,
            "Action_state_processing".to_string()
        );
        assert_eq!(processing_action.creator, context.user.as_ref().unwrap().id);
        assert_eq!(processing_action.intents.len(), 2);
        assert!(processing_action
            .intents
            .iter()
            .all(|intent| { intent.state == "Intent_state_processing" }));

        let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

        let execution_result = execute_icrc112_request(icrc_112_requests, caller, ctx).await;

        assert!(
            execution_result.is_ok(),
            "ICRC112 execution failed: {:?}",
            execution_result.err()
        );

        // update call after execute icrc-112
        context.update_action().await;

        let updated_action = context.action.as_ref().unwrap();

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
