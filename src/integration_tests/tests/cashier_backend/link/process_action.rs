use super::context::LinkTestContext;
use crate::utils::{
    icrc_112::execute_icrc112_request, principal::get_user_principal, with_pocket_ic_context,
};

#[tokio::test]
async fn should_process_action_step_by_step() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let mut context = LinkTestContext::new();

        context
            .setup(ctx, &caller)
            .await
            .airdrop_icp(ctx, 1000000000, &caller)
            .await
            .create_tip_link(ctx)
            .await
            .create_action()
            .await;

        let original_action = context.action.as_ref().unwrap().clone();

        context.process_action().await;

        let processing_action = context.action.as_ref().unwrap().clone();

        let icrc112_execution_result = execute_icrc112_request(
            processing_action.icrc_112_requests.as_ref().unwrap(),
            caller,
            ctx,
        )
        .await;

        // update call after execute icrc-112
        context.update_action().await;

        let updated_action = context.action.as_ref().unwrap();

        assert!(original_action.icrc_112_requests.is_none());
        assert_eq!(original_action.state, "Action_state_created");

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

        assert!(icrc112_execution_result.is_ok());
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

#[tokio::test]
async fn should_have_correct_icrc112_order() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let mut context = LinkTestContext::new();

        context
            .setup(ctx, &caller)
            .await
            .airdrop_icp(ctx, 1000000000, &caller)
            .await
            .create_tip_link(ctx)
            .await
            .create_action()
            .await
            .process_action()
            .await;

        let processing_action = context.action.as_ref().unwrap();
        let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

        let mut group0_methods: Vec<String> = icrc_112_requests[0]
            .iter()
            .map(|r| r.method.clone())
            .collect();
        group0_methods.sort();
        let mut expected_group0 = vec!["icrc2_approve".to_string(), "icrc1_transfer".to_string()];
        expected_group0.sort();

        let mut group1_methods: Vec<String> = icrc_112_requests[1]
            .iter()
            .map(|r| r.method.clone())
            .collect();
        group1_methods.sort();
        let mut expected_group1 = vec!["trigger_transaction".to_string()];
        expected_group1.sort();
        assert_eq!(icrc_112_requests.len(), 2);

        assert_eq!(group0_methods, expected_group0);

        assert_eq!(group1_methods, expected_group1);

        Ok(())
    })
    .await
    .unwrap();
}
