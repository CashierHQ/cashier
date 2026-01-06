// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_common::test_utils::random_principal_id;
use ic_mple_client::CanisterClientError;
use std::sync::Arc;
use token_storage_types::{dto::nft::AddUserNftInput, error::CanisterError, nft::Nft};

use crate::token_storage::nft::fixture::UserNftFixture;
use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_user_add_nft_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        let add_nft_input = AddUserNftInput {
            nft: Nft {
                collection_id: random_principal_id(),
                token_id: Nat::from(1u64),
            },
        };

        // Act
        let add_result = token_storage_client.user_add_nft(add_nft_input).await;

        // Assert
        assert!(add_result.is_err(), "Expected error for anonymous user");
        if let Err(CanisterClientError::PocketIcTestError(err)) = add_result {
            assert!(err.reject_message.contains("AnonimousUserNotAllowed"));
        } else {
            panic!("Expected PocketIcTestError, got {:?}", add_result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_user_add_nft_due_to_invalid_collection() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        let add_nft_input = AddUserNftInput {
            nft: Nft {
                collection_id: random_principal_id(),
                token_id: Nat::from(1u64),
            },
        };

        // Act
        let add_result = token_storage_client
            .user_add_nft(add_nft_input)
            .await
            .unwrap();

        // Assert
        assert!(add_result.is_err(), "Expected error for non-ownership");
        if let Err(CanisterError::UnboundedError(e)) = add_result {
            assert!(e.contains("No route to canister"));
        } else {
            panic!(
                "Expected CanisterError::UnboundedError, got {:?}",
                add_result
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_user_add_nft_due_to_non_ownership() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        let add_nft_input = AddUserNftInput {
            nft: Nft {
                collection_id: ctx.icrc7_ledger_principal,
                token_id: Nat::from(1u64),
            },
        };

        // Act
        let add_result = token_storage_client
            .user_add_nft(add_nft_input)
            .await
            .unwrap();

        // Assert
        assert!(add_result.is_err(), "Expected error for non-ownership");
        if let Err(CanisterError::ValidationErrors(e)) = add_result {
            assert!(e.contains("User is not the owner of the specified NFT"));
        } else {
            panic!(
                "Expected CanisterError::ValidationErrors, got {:?}",
                add_result
            );
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_add_nft_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let user = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(user);
        let fixture = UserNftFixture::new(Arc::new(ctx.clone()));
        let minted_token_ids = fixture.mint_nfts_to_user(user, 1u64).await;
        let add_nft_input = AddUserNftInput {
            nft: Nft {
                collection_id: ctx.icrc7_ledger_principal,
                token_id: minted_token_ids[0].clone(),
            },
        };

        // Act
        let add_result = token_storage_client
            .user_add_nft(add_nft_input)
            .await
            .unwrap();

        // Assert
        assert!(add_result.is_ok(), "Expected successful NFT addition");
        let user_nft = add_result.unwrap();
        assert_eq!(user_nft.nft.collection_id, ctx.icrc7_ledger_principal);
        assert_eq!(user_nft.nft.token_id, minted_token_ids[0]);

        Ok(())
    })
    .await
    .unwrap();
}
