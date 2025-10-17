use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::{principal::TestUser, with_pocket_ic_context};
use cashier_backend_types::constant;
use cashier_backend_types::repository::link::v1::LinkState;
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

#[tokio::test]
async fn it_should_activate_icp_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);

        let initial_balance = 1_000_000_000u64;
        let tip_amount = 1_000_000u64;
        let _caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let _icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        test_fixture.airdrop_icp(initial_balance, &caller).await;
        let create_link_result = test_fixture
            .create_tip_link_v2(constant::ICP_TOKEN, tip_amount)
            .await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result
            .action
            .unwrap()
            .icrc_112_requests
            .unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&link_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let link = activate_link_result.unwrap();
        assert_eq!(link.state, LinkState::Active);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_activate_icrc_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);

        let icp_initial_balance = 1_000_000u64;
        let ckbtc_initial_balance = 1_000_000_000u64;
        let tip_amount = 5_000_000u64;
        let _caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let _ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let _icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        test_fixture.airdrop_icp(icp_initial_balance, &caller).await;
        test_fixture
            .airdrop_icrc(constant::CKBTC_ICRC_TOKEN, ckbtc_initial_balance, &caller)
            .await;
        let create_link_result = test_fixture
            .create_tip_link_v2(constant::CKBTC_ICRC_TOKEN, tip_amount)
            .await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result
            .action
            .unwrap()
            .icrc_112_requests
            .unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, caller, ctx).await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&link_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let link = activate_link_result.unwrap();
        assert_eq!(link.state, LinkState::Active);

        Ok(())
    })
    .await
    .unwrap();
}
