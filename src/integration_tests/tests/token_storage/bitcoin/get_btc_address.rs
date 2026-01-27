// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_client::CanisterClientError;

use crate::utils::{principal::TestUser, with_pocket_ic_context};

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
