// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v3::fixture::LinkTestFixtureV3;
use crate::cashier_backend::link_v3::send_tip::fixture::activate_tip_link_v3_fixture;
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::Nat;
use cashier_backend_types::constant::{CKBTC_ICRC_TOKEN, CKUSDC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::service::link::PaginateInput;
use cashier_shared::types::LinkState as LinkStateShared;
use std::sync::Arc;

#[tokio::test]
async fn it_should_succeed_get_icp_token_tip_link_with_no_link_existed() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let test_fixture =
            LinkTestFixtureV3::new(Arc::new(ctx.clone()), caller, icp_fee.clone()).await;

        // Act
        let get_links_result = test_fixture.user_get_links_v3(None).await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 0);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_icp_token_tip_link_with_no_paginate_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = Nat::from(1_000_000u64);
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let (test_fixture, create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount,
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;

        // Act
        let get_links_result = test_fixture.user_get_links_v3(None).await;
        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 1);
        let link = &links.data[0];
        assert_eq!(link.id, create_link_result.link.id);
        assert_eq!(link.link_type, create_link_result.link.link_type);
        assert_eq!(link.link_state, LinkStateShared::Active);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_icp_token_tip_link_with_paginate_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = Nat::from(1_000_000u64);
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, caller);
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();

        let (_test_fixture, _create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            ICP_TOKEN,
            tip_amount.clone(),
            icp_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let (_test_fixture, _create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            CKBTC_ICRC_TOKEN,
            tip_amount.clone(),
            ckbtc_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        let (test_fixture, _create_link_result) = activate_tip_link_v3_fixture(
            ctx,
            CKUSDC_ICRC_TOKEN,
            tip_amount,
            ckusdc_fee.clone(),
            icp_fee.clone(),
        )
        .await;
        // Act
        let input = PaginateInput {
            limit: 10,
            offset: 0,
        };
        let get_links_result = test_fixture.user_get_links_v3(Some(input)).await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 3);

        // Act
        let input = PaginateInput {
            limit: 10,
            offset: 10,
        };
        let get_links_result = test_fixture.user_get_links_v3(Some(input)).await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 0);

        // Act
        let input = PaginateInput {
            limit: 2,
            offset: 1,
        };
        let get_links_result = test_fixture.user_get_links_v3(Some(input)).await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 2);

        Ok(())
    })
    .await
    .unwrap();
}
