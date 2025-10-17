use crate::cashier_backend::link::fixture::{LinkTestFixture, create_tip_linkv2_fixture};
use crate::constant::{CK_BTC_PRINCIPAL, ICP_PRINCIPAL};
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::Principal;
use cashier_backend_types::constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::dto::action::Icrc112Request;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::link::v1::LinkState;
use ic_mple_client::CanisterClientError;

#[tokio::test]
async fn it_should_error_activate_icp_token_tip_linkv2_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        let caller = Principal::anonymous();
        let caller_fixture = LinkTestFixture::new(test_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let activate_link_result = cashier_backend_client.activate_link_v2(&link_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());
        if let Err(CanisterClientError::PocketIcTestError(err)) = activate_link_result {
            assert!(
                err.reject_message
                    .contains("Anonymous caller is not allowed")
            );
        } else {
            panic!("Expected PocketIcTestError, got {:?}", activate_link_result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_activate_icp_token_tip_linkv2_if_caller_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture = LinkTestFixture::new(test_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let activate_link_result = cashier_backend_client.activate_link_v2(&link_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::Unauthorized(err) => {
                    assert_eq!(err, "Only the creator can publish the link");
                }
                _ => {
                    panic!("Expected UnauthorizedError, got different error: {:?}", err);
                }
            }
        } else {
            panic!("Expected error, got success");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_activate_icp_token_tip_linkv2_if_link_not_exists() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, _create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        // Act: Activate the link
        let link_id = "not_existsing_link_id".to_string();
        let activate_link_result = test_fixture.activate_link_v2(&link_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::NotFound(err) => {
                    assert_eq!(err, "Link not found");
                }
                _ => {
                    panic!("Expected NotFoundError, got different error: {:?}", err);
                }
            }
        } else {
            panic!("Expected error, got success");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_activate_icp_token_tip_linkv2_if_insufficient_token_balance_in_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&link_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::ValidationErrors(err) => {
                    assert!(err.contains(
                        format!("Insufficient balance for asset {}", ICP_PRINCIPAL).as_str()
                    ));
                }
                _ => {
                    panic!("Expected ValidationErrors, got different error: {:?}", err);
                }
            }
        } else {
            panic!("Expected error, got success");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_activate_icp_token_tip_linkv2_if_insufficient_icp_allowance_for_creation_fee()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        // Act: Execute only deposit asset tx in ICRC112 requests
        let icrc_112_requests = create_link_result
            .action
            .unwrap()
            .icrc_112_requests
            .unwrap();

        assert_eq!(icrc_112_requests.len(), 1);

        let filtered_icrc_112_requests: Vec<Icrc112Request> = icrc_112_requests[0]
            .iter()
            .filter(|req| req.method == "icrc1_transfer")
            .cloned()
            .collect();

        let icrc112_execution_result =
            execute_icrc112_request(&vec![filtered_icrc_112_requests], test_fixture.caller, ctx)
                .await;

        // Assert: ICRC112 execution result
        assert!(icrc112_execution_result.is_ok());

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&link_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::ValidationErrors(err) => {
                    assert!(err.contains("Insufficient allowance for ICP token"));
                }
                _ => {
                    panic!("Expected ValidationErrors, got different error: {:?}", err);
                }
            }
        } else {
            panic!("Expected error, got success");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_error_activate_icrc_token_tip_linkv2_if_insufficient_token_balance_in_link() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, 1_000_000u64).await;

        // Act: Activate the link
        let link_id = create_link_result.link.id.clone();
        let activate_link_result = test_fixture.activate_link_v2(&link_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_err());

        if let Err(err) = activate_link_result {
            match err {
                CanisterError::ValidationErrors(err) => {
                    assert!(err.contains(
                        format!("Insufficient balance for asset {}", CK_BTC_PRINCIPAL).as_str()
                    ));
                }
                _ => {
                    panic!("Expected ValidationErrors, got different error: {:?}", err);
                }
            }
        } else {
            panic!("Expected error, got success");
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_activate_icp_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, ICP_TOKEN, 1_000_000u64).await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result
            .action
            .unwrap()
            .icrc_112_requests
            .unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

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
        let (test_fixture, create_link_result) =
            create_tip_linkv2_fixture(ctx, CKBTC_ICRC_TOKEN, 5_000_000u64).await;

        // Act: Execute ICRC112 requests (simulate FE behavior)
        let icrc_112_requests = create_link_result
            .action
            .unwrap()
            .icrc_112_requests
            .unwrap();
        let icrc112_execution_result =
            execute_icrc112_request(&icrc_112_requests, test_fixture.caller, ctx).await;

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
