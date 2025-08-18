use cashier_backend_types::constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET;
use cashier_backend_types::repository::common::Chain;
use cashier_backend_types::repository::link::v1::{LinkType, Template};

use super::super::fixture::LinkTestFixture;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use std::sync::Arc;

#[tokio::test]
async fn should_create_token_basket_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        fixture.setup_user().await;

        // Act
        let link = fixture.create_token_basket_link().await;

        // Assert
        assert_eq!(link.link_type, Some(LinkType::SendTokenBasket.to_string()));
        assert_eq!(link.template, Some(Template::Central.to_string()));
        assert_eq!(link.asset_info.as_ref().unwrap().len(), 3);

        // Check ICP asset
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].address,
            ctx.icp_ledger_principal.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].chain,
            Chain::IC.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].label,
            format!(
                "{}_{}",
                INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                ctx.icp_ledger_principal.to_text()
            )
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
            10_000_000
        );

        // Check ckBTC asset
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].address,
            ctx.icrc_token_map["ckBTC"].to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].chain,
            Chain::IC.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].label,
            format!(
                "{}_{}",
                INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                ctx.icrc_token_map["ckBTC"].to_text()
            )
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].amount_per_link_use_action,
            1_000_000
        );

        // Check ckUSDC asset
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].address,
            ctx.icrc_token_map["ckUSDC"].to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].chain,
            Chain::IC.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].label,
            format!(
                "{}_{}",
                INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                ctx.icrc_token_map["ckUSDC"].to_text()
            )
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].amount_per_link_use_action,
            10_000_000
        );

        assert_eq!(link.link_use_action_max_count, 1);
        assert_eq!(link.title, Some("Test Link".to_string()));
        assert!(!link.id.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}
