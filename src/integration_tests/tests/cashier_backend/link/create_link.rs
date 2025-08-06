use super::context::CreateLinkTestContext;
use crate::utils::principal::get_user_principal;
use crate::utils::with_pocket_ic_context;

#[tokio::test]
async fn should_create_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let mut context = CreateLinkTestContext::new();

        context.setup(ctx, &caller).await.create_link().await;

        let link = context.link.as_ref().unwrap();
        assert_eq!(link.link_type, Some("SendTip".to_string()));
        assert_eq!(link.template, Some("Central".to_string()));
        assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].address,
            "ryjl3-tyaaa-aaaaa-aaaba-cai"
        );
        assert_eq!(link.asset_info.as_ref().unwrap()[0].chain, "IC");
        assert_eq!(link.asset_info.as_ref().unwrap()[0].label, "SEND_TIP_ASSET");
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
            1000000
        );
        assert_eq!(link.link_use_action_max_count, 1);
        assert_eq!(link.title, Some("Test Link".to_string()));
        assert!(!link.id.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}
