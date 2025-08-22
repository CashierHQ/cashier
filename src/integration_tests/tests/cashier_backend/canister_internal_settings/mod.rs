use crate::{
    cashier_backend::link::fixture::LinkTestFixture,
    utils::{PocketIcTestContextBuilder, principal::TestUser},
};
use cashier_backend_types::dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput};
use std::sync::Arc;

#[tokio::test]
async fn should_return_error_if_in_maintenance_mode() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .build_async()
        .await;
    let arc_ctx = Arc::new(ctx);

    let cashier_backend_admin_client =
        arc_ctx.new_cashier_backend_client(TestUser::AdminDeployer.get_principal());
    let non_admin_client = arc_ctx.new_cashier_backend_client(TestUser::User1.get_principal());
    let fixture = LinkTestFixture::new(arc_ctx.clone(), &TestUser::User1.get_principal()).await;
    let input = CreateLinkInput {
        title: "Test Link".to_string(),
        link_use_action_max_count: 1,
        asset_info: vec![LinkDetailUpdateAssetInfoInput {
            address: arc_ctx.icp_ledger_principal.to_string(),
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
    cashier_backend_admin_client
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
}

#[tokio::test]
async fn should_return_error_if_user_is_not_admin() {
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .build_async()
        .await;
    let arc_ctx = Arc::new(ctx);

    let non_admin_client = arc_ctx.new_cashier_backend_client(TestUser::User1.get_principal());

    // Act
    let res = non_admin_client.change_to_maintenance_mode(true).await;

    // Assert
    assert!(
        res.is_err(),
        "Non-admin should not be able to change to maintenance mode"
    );
}

#[tokio::test]
async fn should_success_for_another_admin() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .build_async()
        .await;
    let arc_ctx = Arc::new(ctx);

    let admin2_client = arc_ctx.new_cashier_backend_client(TestUser::Admin2.get_principal());

    // Act & Assert: admin2 should be able to enable maintenance mode
    admin2_client
        .change_to_maintenance_mode(true)
        .await
        .expect("Admin2 should be able to enable maintenance mode");

    // Act & Assert: admin2 should be able to disable maintenance mode
    admin2_client
        .change_to_maintenance_mode(false)
        .await
        .expect("Admin2 should be able to disable maintenance mode");
}

#[tokio::test]
async fn should_success_add_and_remove_admin() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .build_async()
        .await;
    let arc_ctx = Arc::new(ctx);

    let admin_deployer_client =
        arc_ctx.new_cashier_backend_client(TestUser::AdminDeployer.get_principal());
    let user1_client = arc_ctx.new_cashier_backend_client(TestUser::User1.get_principal());

    // Act - add User1 as an admin
    let add_admin_res = admin_deployer_client
        .add_new_admin(TestUser::User1.get_principal().to_string())
        .await
        .unwrap();

    // Assert
    assert!(add_admin_res.is_ok(), "admin_add_new_admin call failed");

    // Act - User1 should now be able to change maintenance mode
    let change_mode_res = user1_client.change_to_maintenance_mode(true).await;

    // Assert that User1 can change maintenance mode after being added as admin
    assert!(
        change_mode_res.is_ok(),
        "User1 should be able to change maintenance mode after being added as admin"
    );

    // Act - remove User1 as an admin
    let remove_admin_res = admin_deployer_client
        .remove_admin(TestUser::User1.get_principal().to_string())
        .await;

    // Assert that the admin removal was successful
    assert!(remove_admin_res.is_ok(), "admin_remove_admin call failed");

    // Act - User1 should no longer be able to change maintenance mode
    let res = user1_client.change_to_maintenance_mode(false).await;

    // Assert that User1 cannot change maintenance mode after being removed as admin
    assert!(
        res.is_err(),
        "Removed admin should not be able to change maintenance mode"
    );
}
