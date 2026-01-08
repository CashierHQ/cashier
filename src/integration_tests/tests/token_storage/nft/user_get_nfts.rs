// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_client::CanisterClientError;
use std::sync::Arc;
use token_storage_types::dto::nft::GetUserNftInput;

use crate::token_storage::nft::fixture::UserNftFixture;
use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_user_get_nfts_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        let input = GetUserNftInput {
            start: Some(0),
            limit: Some(10),
        };

        // Act
        let result = token_storage_client.user_get_nfts(input).await;

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
async fn it_should_return_user_get_nfts_empty_when_no_nfts() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        let input = GetUserNftInput {
            start: Some(0),
            limit: Some(10),
        };

        // Act
        let nfts = token_storage_client.user_get_nfts(input).await.unwrap();

        // Assert
        assert!(nfts.is_empty(), "Expected no NFTs for the user");

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_return_user_get_nfts_with_pagination() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User2.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        let fixture = UserNftFixture::new(Arc::new(ctx.clone()));
        let _minted_nft_ids = fixture.mint_and_add_nft_to_user(caller, 10).await;

        let input = GetUserNftInput {
            start: Some(0),
            limit: Some(5),
        };

        // Act
        let nfts = token_storage_client.user_get_nfts(input).await.unwrap();

        // Assert
        assert_eq!(nfts.len(), 5, "Expected 5 NFTs for the first page");

        // Arrange for second page
        let input_page_2 = GetUserNftInput {
            start: Some(5),
            limit: Some(5),
        };

        // Act for second page
        let nfts_page_2 = token_storage_client
            .user_get_nfts(input_page_2)
            .await
            .unwrap();

        // Assert for second page
        assert_eq!(nfts_page_2.len(), 5, "Expected 5 NFTs for the second page");

        // Arrange for third page
        let input_page_3 = GetUserNftInput {
            start: Some(10),
            limit: Some(5),
        };

        // Act for third page
        let nfts_page_3 = token_storage_client
            .user_get_nfts(input_page_3)
            .await
            .unwrap();

        // Assert for third page
        assert!(
            nfts_page_3.is_empty(),
            "Expected no NFTs for the third page"
        );

        Ok(())
    })
    .await
    .unwrap();
}
