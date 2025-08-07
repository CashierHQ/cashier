use cashier_types::constant::INTENT_LABEL_SEND_TIP_ASSET;
use cashier_types::repository::common::Chain;
use cashier_types::repository::link::v1::{LinkType, Template};

use super::super::fixture::LinkTestFixture;
use crate::constant::ICP_PRINCIPAL;
use crate::utils::principal::get_user_principal;
use crate::utils::with_pocket_ic_context;

#[tokio::test]
async fn should_create_send_tip_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let fixture = LinkTestFixture::new(ctx, &caller).await;

        fixture.setup_user().await;

        let link = fixture.create_tip_link(ctx, 100_000_000u64).await;

        assert_eq!(link.link_type, Some(LinkType::SendTip.to_string()));
        assert_eq!(link.template, Some(Template::Central.to_string()));
        assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
        assert_eq!(link.asset_info.as_ref().unwrap()[0].address, ICP_PRINCIPAL);
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].chain,
            Chain::IC.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].label,
            INTENT_LABEL_SEND_TIP_ASSET.to_string()
        );
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
