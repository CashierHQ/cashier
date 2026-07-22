// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::collection::{ListCollectionsInput, UpsertCollectionsInput};

use crate::token_storage::collection::fixture::{CollectionManagerFixture, fixture_of_collection};
use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_not_allow_user_to_upsert_collections() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin_client =
            ctx.new_token_storage_client(TestUser::TokenStorageAdmin.get_principal());
        admin_client
            .admin_inspect_message_enable(false)
            .await
            .unwrap()
            .unwrap();
        let user = TestUser::User2.get_principal();
        let user_client = ctx.new_token_storage_client(user);
        let collection = fixture_of_collection(candid::Principal::from_slice(&[1; 1]), "Bored Ape");

        // Act
        let result = user_client
            .collection_manager_upsert_collections(UpsertCollectionsInput {
                collections: vec![collection],
            })
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("NotAuthorized"));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_admin_to_upsert_collections() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin_client =
            ctx.new_token_storage_client(TestUser::TokenStorageAdmin.get_principal());
        let collection = fixture_of_collection(candid::Principal::from_slice(&[1; 1]), "Bored Ape");

        // Act
        let result = admin_client
            .collection_manager_upsert_collections(UpsertCollectionsInput {
                collections: vec![collection],
            })
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.upserted, 1);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_collection_manager_to_upsert_collections() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let fixture = CollectionManagerFixture::new(ctx).await;
        let collection_manager_client = ctx.new_token_storage_client(fixture.collection_manager);
        let collection = fixture_of_collection(candid::Principal::from_slice(&[1; 1]), "Bored Ape");

        // Act
        let result = collection_manager_client
            .collection_manager_upsert_collections(UpsertCollectionsInput {
                collections: vec![collection],
            })
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.upserted, 1);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_replace_not_duplicate_on_re_upsert() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin_client =
            ctx.new_token_storage_client(TestUser::TokenStorageAdmin.get_principal());
        let collection_id = candid::Principal::from_slice(&[1; 1]);

        // Act: upsert once
        admin_client
            .collection_manager_upsert_collections(UpsertCollectionsInput {
                collections: vec![fixture_of_collection(collection_id, "Bored Ape")],
            })
            .await
            .unwrap()
            .unwrap();

        // Act: upsert again with a changed name
        admin_client
            .collection_manager_upsert_collections(UpsertCollectionsInput {
                collections: vec![fixture_of_collection(collection_id, "Bored Ape v2")],
            })
            .await
            .unwrap()
            .unwrap();

        let all = admin_client
            .list_collections(ListCollectionsInput {
                start: None,
                limit: None,
            })
            .await
            .unwrap();

        // Assert: exactly one record, with the latest name
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].name, "Bored Ape v2");

        Ok(())
    })
    .await
    .unwrap();
}
