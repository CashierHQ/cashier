// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::service::link::PaginateInput;
use cashier_shared::types::LinkState as LinkStateShared;
use std::sync::Arc;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3, send_basket::fixture::activate_basket_link_v3_fixture,
    },
    constant::{CKBTC_ICRC_TOKEN, CKUSDC_ICRC_TOKEN, ICP_TOKEN},
    utils::{principal::TestUser, with_pocket_ic_context},
};

fn fixture_of_three_tokens() -> (Vec<String>, Vec<Nat>) {
    (
        vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ],
        vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ],
    )
}

#[tokio::test]
async fn it_should_succeed_get_basket_links_with_no_link_existed() {
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
async fn it_should_succeed_get_basket_links_with_no_paginate_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: basket always contains ICP + ckBTC + ckUSDC
        let caller = TestUser::User1.get_principal();
        let (tokens, amounts) = fixture_of_three_tokens();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];

        let (test_fixture, create_link_result) =
            activate_basket_link_v3_fixture(ctx, tokens, amounts, token_fees, icp_fee.clone())
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
async fn it_should_succeed_get_basket_links_with_paginate_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: every created basket uses ICP + ckBTC + ckUSDC
        let caller = TestUser::User1.get_principal();
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee.clone(), ckusdc_fee.clone()];

        let (tokens, amounts_1) = fixture_of_three_tokens();
        let (_fixture, _link_1) = activate_basket_link_v3_fixture(
            ctx,
            tokens,
            amounts_1,
            token_fees.clone(),
            icp_fee.clone(),
        )
        .await;

        let (tokens, amounts_2) = (
            vec![
                ICP_TOKEN.to_string(),
                CKBTC_ICRC_TOKEN.to_string(),
                CKUSDC_ICRC_TOKEN.to_string(),
            ],
            vec![
                Nat::from(2_000_000u64),
                Nat::from(6_000_000u64),
                Nat::from(8_000_000u64),
            ],
        );
        let (_fixture, _link_2) = activate_basket_link_v3_fixture(
            ctx,
            tokens,
            amounts_2,
            token_fees.clone(),
            icp_fee.clone(),
        )
        .await;

        let (tokens, amounts_3) = (
            vec![
                ICP_TOKEN.to_string(),
                CKBTC_ICRC_TOKEN.to_string(),
                CKUSDC_ICRC_TOKEN.to_string(),
            ],
            vec![
                Nat::from(3_000_000u64),
                Nat::from(7_000_000u64),
                Nat::from(9_000_000u64),
            ],
        );
        let (test_fixture, _link_3) =
            activate_basket_link_v3_fixture(ctx, tokens, amounts_3, token_fees, icp_fee.clone())
                .await;

        // Act
        let get_links_result = test_fixture
            .user_get_links_v3(Some(PaginateInput {
                limit: 10,
                offset: 0,
            }))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 3);

        // Act
        let get_links_result = test_fixture
            .user_get_links_v3(Some(PaginateInput {
                limit: 10,
                offset: 10,
            }))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 0);

        // Act
        let get_links_result = test_fixture
            .user_get_links_v3(Some(PaginateInput {
                limit: 2,
                offset: 1,
            }))
            .await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 2);

        Ok(())
    })
    .await
    .unwrap();
}
