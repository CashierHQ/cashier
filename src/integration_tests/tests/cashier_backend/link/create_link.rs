use super::fixtures::CreateLinkTestFixture;
use crate::utils::principal::get_user_principal;
use crate::utils::with_pocket_ic_context;

#[tokio::test]
async fn should_create_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let cashier_backend_client = ctx.new_cashier_backend_client(caller);
        let mut fixture = CreateLinkTestFixture::new(cashier_backend_client);

        fixture.setup_environment(ctx).await.create_link().await;

        assert_eq!(fixture.link.link_type, Some("SendTip".to_string()));
        assert_eq!(fixture.link.template, Some("Central".to_string()));
        assert_eq!(fixture.link.asset_info.as_ref().unwrap().len(), 1);
        assert_eq!(
            fixture.link.asset_info.as_ref().unwrap()[0].address,
            "ryjl3-tyaaa-aaaaa-aaaba-cai"
        );
        assert_eq!(fixture.link.asset_info.as_ref().unwrap()[0].chain, "IC");
        assert_eq!(
            fixture.link.asset_info.as_ref().unwrap()[0].label,
            "SEND_TIP_ASSET"
        );
        assert_eq!(
            fixture.link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
            1000000
        );
        assert_eq!(fixture.link.link_use_action_max_count, 10);
        assert_eq!(fixture.link.title, Some("Test Link".to_string()));
        assert!(!fixture.link.id.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}
