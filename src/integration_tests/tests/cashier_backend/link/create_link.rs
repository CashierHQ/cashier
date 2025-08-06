use super::fixture::LinkTestFixture;
use crate::utils::principal::get_user_principal;
use crate::utils::with_pocket_ic_context;

#[tokio::test]
async fn should_create_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        fixture.setup_user().await;

        let link = fixture.create_tip_link(ctx).await;

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

#[tokio::test]
async fn should_create_token_basket_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        fixture.setup_user().await;

        let link = fixture.create_token_basket_link(ctx).await;

        assert_eq!(link.link_type, Some("SendTokenBasket".to_string()));
        assert_eq!(link.template, Some("Central".to_string()));
        assert_eq!(link.asset_info.as_ref().unwrap().len(), 3);
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].address,
            ctx.icp_ledger_principal.to_string()
        );
        assert_eq!(link.asset_info.as_ref().unwrap()[0].chain, "IC");
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].label,
            "SEND_TOKEN_BASKET_ASSET"
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
            10000000
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].address,
            ctx.icrc_token_map["ckBTC"].to_string()
        );
        assert_eq!(link.asset_info.as_ref().unwrap()[1].chain, "IC");
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].label,
            "SEND_TOKEN_BASKET_ASSET"
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].amount_per_link_use_action,
            1000000
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].address,
            ctx.icrc_token_map["ckUSDC"].to_string()
        );
        assert_eq!(link.asset_info.as_ref().unwrap()[2].chain, "IC");
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].label,
            "SEND_TOKEN_BASKET_ASSET"
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].amount_per_link_use_action,
            100000000
        );

        Ok(())
    })
    .await
    .unwrap();
}
