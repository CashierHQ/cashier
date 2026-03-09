// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_backend_types::error::CanisterError;
use cashier_shared::types::LinkState as LinkStateShared;

use crate::{
    cashier_backend::link_v3::{
        fixture::LinkTestFixtureV3,
        send_basket::fixture::{activate_basket_link_v3_fixture, create_basket_link_v3_fixture},
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
async fn it_should_fail_disable_basket_link_if_link_not_active() {
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

        let (test_fixture, create_link_result) = create_basket_link_v3_fixture(
            ctx,
            caller,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v3(&link_id).await;

        // Assert
        assert!(disable_link_result.is_err());
        if let Err(CanisterError::ValidationErrors(msg)) = disable_link_result {
            assert!(
                msg.contains("Only active links can be disabled"),
                "Unexpected error message: {}",
                msg
            );
        } else {
            panic!(
                "Expected CanisterError::ValidationErrors, got {:?}",
                disable_link_result
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_disable_basket_link_if_caller_is_not_creator() {
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

        let (test_fixture, create_link_result) = create_basket_link_v3_fixture(
            ctx,
            caller,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture =
            LinkTestFixtureV3::new(test_fixture.ctx.clone(), caller, icp_fee.clone()).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = cashier_backend_client.user_disable_link_v3(&link_id).await;

        // Assert
        assert!(disable_link_result.is_ok());
        let disable_link_result = disable_link_result.unwrap();
        assert!(disable_link_result.is_err());

        if let Err(err) = disable_link_result {
            match err {
                CanisterError::Unauthorized(err) => {
                    assert_eq!(err, "Only the creator can disable the link");
                }
                _ => panic!("Expected UnauthorizedError, got {:?}", err),
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
async fn it_should_succeed_disable_basket_link() {
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

        let (test_fixture, create_link_result) = activate_basket_link_v3_fixture(
            ctx,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;

        // Act
        let link_id = create_link_result.link.id.clone();
        let disable_link_result = test_fixture.disable_link_v3(&link_id).await;

        // Assert
        assert!(disable_link_result.is_ok());
        let result = disable_link_result.unwrap();
        assert_eq!(result.link.link_state, LinkStateShared::Inactive);

        Ok(())
    })
    .await
    .unwrap();
}
