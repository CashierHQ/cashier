// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_client::CanisterClientError;

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_do_user_get_rune_address_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        // Act
        let result = token_storage_client.user_get_rune_address().await;

        // Assert
        assert!(result.is_err());
        match result {
            Err(CanisterClientError::PocketIcTestError(err)) => {
                assert!(err.reject_message.contains("AnonimousUserNotAllowed"));
            }
            _ => panic!("Expected PocketIcTestError, got {:?}", result),
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_do_user_get_rune_address_due_to_omnity_canister_unavailable() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        // Act
        let result = token_storage_client.user_get_rune_address().await.unwrap();

        // Assert
        assert!(result.is_err());

        Ok(())
    })
    .await
    .unwrap();
}
