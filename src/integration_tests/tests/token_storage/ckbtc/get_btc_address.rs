// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use bitcoin::Address as BitcoinAddress;
use candid::{Nat, Principal};
use cashier_common::test_utils::random_principal_id;
use ic_cdk::bitcoin_canister;
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;
use std::str::FromStr;

use crate::{
    constants::{BTC_RPC_PASSWORD, BTC_RPC_USER},
    token_storage::ckbtc::btc_fixture::BtcFixture,
    utils::{principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_fail_user_get_btc_address_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        // Act
        let result = token_storage_client.user_get_btc_address().await;

        // Assert
        assert!(result.is_err(), "Expected error for anonymous user");
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
async fn it_should_get_btc_address_for_valid_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        // Act
        let result = token_storage_client.user_get_btc_address().await;

        // Assert
        assert!(result.is_ok(), "Expected successful BTC address retrieval");
        let btc_address_result = result.unwrap();
        assert!(btc_address_result.is_ok(), "Expected BTC address in result");
        let btc_address = btc_address_result.unwrap();
        assert!(!btc_address.is_empty(), "BTC address should not be empty");
        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_mine_btc_to_user_address_and_check_balance() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let btc_fixture = BtcFixture::new("http://localhost:18443", BTC_RPC_USER, BTC_RPC_PASSWORD);

        let bitcoin_canister = ctx.bitcoin_canister_principal;
        println!("Bitcoin canister principal: {}", bitcoin_canister);

        let ckbtc_kyt_client = ctx.new_ckbtc_kyt_client(TestUser::TokenDeployer.get_principal());
        let _ = ckbtc_kyt_client.set_api_key("test_key").await.unwrap();

        let caller = TestUser::User2.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client("ckBTC", caller);

        // Act
        let btc_address_result = token_storage_client
            .user_get_btc_address()
            .await
            .expect("Failed to get BTC address")
            .expect("No BTC address returned");

        println!("Mined BTC address: {}", btc_address_result);

        let btc_address = BitcoinAddress::from_str(&btc_address_result)
            .unwrap()
            .require_network(bitcoin::Network::Regtest)
            .unwrap();

        println!("Parsed BTC address: {}", btc_address);

        // Mine some BTC to the user's address
        btc_fixture.generate_to_address(101, &btc_address);
        // btc_fixture.send_to_address(&btc_address, 1f64);
        // btc_fixture.generate_to_address(6, &btc_fixture.test_btc_address);

        // Check the balance of the user's BTC address
        // let balance = btc_fixture.get_balance(&btc_address);
        // println!("BTC balance for address {}: {}", btc_address, balance);

        // // Assert
        // assert!(
        //     balance > 0.0,
        //     "Expected BTC balance to be greater than 0, got {}",
        //     balance
        // );

        // update balance via token storage
        let update_balance_result = token_storage_client
            .user_update_balance()
            .await
            .expect("Failed to update BTC balance");

        println!(
            "Updated BTC balance via token storage: {:?}",
            update_balance_result
        );

        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };

        let ckbtc_balance = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .expect("Failed to get ckBTC balance");

        println!("ckBTC balance for user: {}", ckbtc_balance);

        panic!();

        Ok(())
    })
    .await
    .unwrap();
}
