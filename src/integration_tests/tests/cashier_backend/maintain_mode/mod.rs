use crate::{
    cashier_backend::link::fixture::LinkTestFixture,
    utils::{principal::TestUser, with_pocket_ic_context},
};
use cashier_backend_types::dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput};

#[tokio::test]
async fn should_return_error_if_in_maintenance_mode() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let cashier_backend_admin_client = ctx.new_cashier_backend_client(ctx.admin);

        let non_admin_client = ctx.new_cashier_backend_client(TestUser::User1.get_principal());
        let fixture = LinkTestFixture::new(ctx, &TestUser::User1.get_principal()).await;
        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![LinkDetailUpdateAssetInfoInput {
                address: ctx.icp_ledger_principal.to_string(),
                chain: "IC".to_string(),
                label: "SEND_TIP_ASSET".to_string(),
                amount_per_link_use_action: 1000u64,
            }],
            template: "Central".to_string(),
            link_type: "SendTip".to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test link for integration testing".to_string()),
        };
        fixture.setup_user().await;

        // Act
        let _ = cashier_backend_admin_client
            .change_to_maintenance_mode(true)
            .await
            .expect("canister call failed");
        let res = non_admin_client.create_link(input).await;

        // Assert
        assert!(
            res.is_err(),
            "Non-admin should not be able to create link in maintenance mode"
        );
        assert!(
            res.unwrap_err()
                .to_string()
                .contains("Canister is currently under maintenance"),
        );
        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_return_error_if_user_is_not_admin() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let non_admin_client = ctx.new_cashier_backend_client(TestUser::User1.get_principal());

        // Act
        let res = non_admin_client.change_to_maintenance_mode(true).await;

        // Assert
        assert!(
            res.is_err(),
            "Non-admin should not be able to change to maintenance mode"
        );

        Ok(())
    })
    .await
    .unwrap();
}
