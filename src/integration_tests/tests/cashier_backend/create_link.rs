use std::time::Duration;

use cashier_types::dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput};

use crate::utils::{identity::get_user_principal, with_pocket_ic_context};

#[tokio::test]
async fn should_create_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let cashier_backend_client = ctx.new_cashier_backend_client(caller);

        // call twice for `raw_rand`` work or else `raw_rand``` api will return error
        ctx.advance_time(Duration::from_secs(1)).await;
        ctx.advance_time(Duration::from_secs(1)).await;

        let _ = cashier_backend_client.create_user().await;

        ctx.advance_time(Duration::from_secs(1)).await;

        let _ = cashier_backend_client.get_user().await.unwrap();

        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 10,
            asset_info: vec![LinkDetailUpdateAssetInfoInput {
                address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
                chain: "IC".to_string(),
                label: "ICP".to_string(),
                amount_per_link_use_action: 1000000, // 0.001 ICP in e8s
            }],
            template: "Central".to_string(),
            link_type: "SendTip".to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test link for integration testing".to_string()),
        };

        let res = cashier_backend_client.create_link(input).await.unwrap();
        let link = res.unwrap();

        assert_eq!(link.link_type, Some("SendTip".to_string()));
        assert_eq!(link.template, Some("Central".to_string()));
        assert_eq!(link.asset_info.as_ref().unwrap().len(), 1);
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].address,
            "ryjl3-tyaaa-aaaaa-aaaba-cai"
        );
        assert_eq!(link.asset_info.as_ref().unwrap()[0].chain, "IC");
        assert_eq!(link.asset_info.as_ref().unwrap()[0].label, "ICP");
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
            1000000
        );
        assert_eq!(link.link_use_action_max_count, 10);
        assert_eq!(link.title, Some("Test Link".to_string()));

        Ok(())
    })
    .await
    .unwrap();
}
