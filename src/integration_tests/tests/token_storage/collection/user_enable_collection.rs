// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_client::CanisterClientError;
use token_storage_types::collection::{EnableCollectionInput, EnableCollectionsInput};

use crate::token_storage::collection::fixture::seed_collections;
use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_user_enable_collection_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let seeded = seed_collections(ctx, 1).await;
        let collection_id = seeded.first().unwrap().collection_id;
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        // Act
        let result = token_storage_client
            .user_enable_collection(EnableCollectionInput {
                collection_id,
                is_enabled: true,
            })
            .await;

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
async fn it_should_fail_user_enable_collection_due_to_unknown_collection() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);
        let unknown_id = Principal::from_slice(&[99; 1]);

        // Act
        let result = token_storage_client
            .user_enable_collection(EnableCollectionInput {
                collection_id: unknown_id,
                is_enabled: true,
            })
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_return_empty_enabled_list_for_new_user() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        seed_collections(ctx, 2).await;
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        // Act
        let enabled = token_storage_client
            .user_get_enabled_collections()
            .await
            .unwrap();

        // Assert
        assert!(enabled.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_enable_and_disable_a_collection() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let seeded = seed_collections(ctx, 1).await;
        let collection_id = seeded.first().unwrap().collection_id;
        let caller = TestUser::User2.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        // Act: enable
        token_storage_client
            .user_enable_collection(EnableCollectionInput {
                collection_id,
                is_enabled: true,
            })
            .await
            .unwrap()
            .unwrap();
        let enabled_after_enable = token_storage_client
            .user_get_enabled_collections()
            .await
            .unwrap();

        // Assert: enabled
        assert_eq!(enabled_after_enable, vec![collection_id]);

        // Act: disable
        token_storage_client
            .user_enable_collection(EnableCollectionInput {
                collection_id,
                is_enabled: false,
            })
            .await
            .unwrap()
            .unwrap();
        let enabled_after_disable = token_storage_client
            .user_get_enabled_collections()
            .await
            .unwrap();

        // Assert: disabled
        assert!(enabled_after_disable.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_toggle_enable_be_idempotent() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let seeded = seed_collections(ctx, 1).await;
        let collection_id = seeded.first().unwrap().collection_id;
        let caller = TestUser::User3.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        // Act
        for _ in 0..2 {
            token_storage_client
                .user_enable_collection(EnableCollectionInput {
                    collection_id,
                    is_enabled: true,
                })
                .await
                .unwrap()
                .unwrap();
        }
        let enabled = token_storage_client
            .user_get_enabled_collections()
            .await
            .unwrap();

        // Assert
        assert_eq!(enabled, vec![collection_id]);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_enable_collections_in_batch_and_drop_unknown_ids() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let seeded = seed_collections(ctx, 2).await;
        let known_id_1 = seeded[0].collection_id;
        let known_id_2 = seeded[1].collection_id;
        let unknown_id = Principal::from_slice(&[99; 1]);
        let caller = TestUser::User1.get_principal();
        let token_storage_client = ctx.new_token_storage_client(caller);

        // Act
        token_storage_client
            .user_enable_collections_batch(EnableCollectionsInput {
                collection_ids: vec![known_id_1, known_id_2, unknown_id],
            })
            .await
            .unwrap()
            .unwrap();
        let mut enabled = token_storage_client
            .user_get_enabled_collections()
            .await
            .unwrap();
        enabled.sort();
        let mut expected = vec![known_id_1, known_id_2];
        expected.sort();

        // Assert
        assert_eq!(enabled, expected);

        Ok(())
    })
    .await
    .unwrap();
}
