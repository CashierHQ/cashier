// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Decode, Nat, Principal};
use cashier_shared::types::{AddressType as AddressTypeShared, LinkType as LinkTypeShared};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::{icrc1::account::Account, icrc2::approve::ApproveArgs};
use std::sync::Arc;

use crate::{
    cashier_backend::link_v3::send_basket::fixture::BasketLinkV3Fixture,
    constant::{
        CK_BTC_PRINCIPAL, CK_USDC_PRINCIPAL, CKBTC_ICRC_TOKEN, CKUSDC_ICRC_TOKEN, ICP_PRINCIPAL,
        ICP_TOKEN,
    },
    utils::{principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_error_create_token_basket_linkv3_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: basket always contains ICP + ckBTC + ckUSDC
        let be_client = ctx.new_cashier_backend_client(Principal::anonymous());
        let caller = TestUser::User1.get_principal();
        let tokens = vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ];
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];

        let test_fixture = BasketLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            tokens,
            amounts,
            token_fees,
            icp_fee.clone(),
        )
        .await;
        let input = test_fixture.token_basket_link_input().unwrap();

        // Act
        let result = be_client.user_create_link_v3(input).await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterClientError::PocketIcTestError(err)) = result {
            assert!(err.reject_message.contains("AnonimousUserNotAllowed"));
        } else {
            panic!("Expected PocketIcTestError, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_three_tokens_basket_linkv3_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange: basket always contains ICP + ckBTC + ckUSDC
        let caller = TestUser::User1.get_principal();
        let tokens = vec![
            ICP_TOKEN.to_string(),
            CKBTC_ICRC_TOKEN.to_string(),
            CKUSDC_ICRC_TOKEN.to_string(),
        ];
        let amounts = vec![
            Nat::from(1_000_000u64),
            Nat::from(5_000_000u64),
            Nat::from(7_000_000u64),
        ];
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(CKUSDC_ICRC_TOKEN, caller);
        let icp_fee = icp_ledger_client.fee().await.unwrap_or_default();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap_or_default();
        let ckusdc_fee = ckusdc_ledger_client.fee().await.unwrap_or_default();
        let token_fees = vec![icp_fee.clone(), ckbtc_fee, ckusdc_fee];

        let mut test_fixture = BasketLinkV3Fixture::new(
            Arc::new(ctx.clone()),
            caller,
            tokens,
            amounts.clone(),
            token_fees,
            icp_fee.clone(),
        )
        .await;

        let icp_initial_balance = Nat::from(1_000_000_000u64);
        let ckbtc_initial_balance = Nat::from(1_000_000_000u64);
        let ckusdc_initial_balance = Nat::from(1_000_000_000u64);
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };

        // Act
        test_fixture
            .link_fixture
            .airdrop_icp(icp_initial_balance.clone(), &caller)
            .await;
        test_fixture
            .link_fixture
            .airdrop_icrc(CKBTC_ICRC_TOKEN, ckbtc_initial_balance.clone(), &caller)
            .await;
        test_fixture
            .link_fixture
            .airdrop_icrc(CKUSDC_ICRC_TOKEN, ckusdc_initial_balance.clone(), &caller)
            .await;

        // Assert
        let icp_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        let ckusdc_balance_before = ckusdc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(icp_balance_before, icp_initial_balance);
        assert_eq!(ckbtc_balance_before, ckbtc_initial_balance);
        assert_eq!(ckusdc_balance_before, ckusdc_initial_balance);

        // Act
        let create_link_result = test_fixture.create_link().await;

        // Assert link
        let link = create_link_result.link;
        assert!(!link.id.is_empty());
        assert_eq!(link.link_type, LinkTypeShared::SendTokenBasket);
        assert_eq!(link.asset_info.len(), 3);
        assert_eq!(link.asset_info[0].amount, amounts[0]);
        assert_eq!(link.asset_info[1].amount, amounts[1]);
        assert_eq!(link.asset_info[2].amount, amounts[2]);

        // Assert action intents
        let action = create_link_result.action;
        assert_eq!(action.intents.len(), 4);

        let fee_intent = action
            .intents
            .iter()
            .find(|intent| {
                intent.source_address_type == AddressTypeShared::Creator
                    && intent.dest_address_type == AddressTypeShared::Treasury
            })
            .expect("TransferWalletToTreasury intent not found");
        assert_eq!(
            fee_intent.asset.address,
            Principal::from_text(ICP_PRINCIPAL).unwrap()
        );

        let to_link_intents: Vec<_> = action
            .intents
            .iter()
            .filter(|intent| {
                intent.source_address_type == AddressTypeShared::Creator
                    && intent.dest_address_type == AddressTypeShared::Link
            })
            .collect();
        assert_eq!(to_link_intents.len(), 3);

        let icp_asset_intent = to_link_intents
            .iter()
            .find(|intent| intent.asset.address == Principal::from_text(ICP_PRINCIPAL).unwrap())
            .expect("ICP asset intent not found");
        assert_eq!(icp_asset_intent.amount, Nat::from(1_000_000u64));

        let ckbtc_asset_intent = to_link_intents
            .iter()
            .find(|intent| intent.asset.address == Principal::from_text(CK_BTC_PRINCIPAL).unwrap())
            .expect("ckBTC asset intent not found");
        assert_eq!(ckbtc_asset_intent.amount, Nat::from(5_000_000u64));

        let ckusdc_asset_intent = to_link_intents
            .iter()
            .find(|intent| intent.asset.address == Principal::from_text(CK_USDC_PRINCIPAL).unwrap())
            .expect("ckUSDC asset intent not found");
        assert_eq!(ckusdc_asset_intent.amount, Nat::from(7_000_000u64));

        // Assert ICRC-112 requests
        assert!(create_link_result.icrc112_requests.is_some());
        let icrc112_requests = create_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        // Unique ledgers in basket: ICP, ckBTC, ckUSDC
        assert_eq!(requests.len(), 3);
        for req in requests {
            assert_eq!(req.method.as_str(), "icrc2_approve");
            assert!(
                req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
                    || req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
                    || req.canister_id == Principal::from_text(CK_USDC_PRINCIPAL).unwrap()
            );

            let approve_args: ApproveArgs = Decode!(req.arg.as_slice(), ApproveArgs).unwrap();
            assert_eq!(
                approve_args.spender,
                Account {
                    owner: ctx.cashier_backend_principal,
                    subaccount: None,
                }
            );
            assert!(approve_args.amount > 0u64);
        }

        Ok(())
    })
    .await
    .unwrap();
}
