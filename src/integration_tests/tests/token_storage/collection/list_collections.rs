// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::collection::{ListCollectionsInput, UpsertCollectionsInput};

use crate::token_storage::collection::fixture::{fixture_of_collection, seed_collections};
use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_return_empty_list_for_empty_registry() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        // Act
        let result = token_storage_client
            .list_collections(ListCollectionsInput {
                start: None,
                limit: None,
                is_default: None,
            })
            .await
            .unwrap();

        // Assert
        assert!(result.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_allow_anonymous_caller_to_list_collections() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        seed_collections(ctx, 3).await;
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        // Act
        let result = token_storage_client
            .list_collections(ListCollectionsInput {
                start: None,
                limit: None,
                is_default: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(result.len(), 3);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_paginate_collections_with_stable_pages() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        seed_collections(ctx, 10).await;
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        // Act
        let page_1 = token_storage_client
            .list_collections(ListCollectionsInput {
                start: Some(0),
                limit: Some(5),
                is_default: None,
            })
            .await
            .unwrap();
        let page_2 = token_storage_client
            .list_collections(ListCollectionsInput {
                start: Some(5),
                limit: Some(5),
                is_default: None,
            })
            .await
            .unwrap();
        let page_3 = token_storage_client
            .list_collections(ListCollectionsInput {
                start: Some(10),
                limit: Some(5),
                is_default: None,
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(page_1.len(), 5);
        assert_eq!(page_2.len(), 5);
        assert!(page_3.is_empty());
        let page_1_ids: Vec<_> = page_1.iter().map(|c| c.collection_id).collect();
        let page_2_ids: Vec<_> = page_2.iter().map(|c| c.collection_id).collect();
        assert!(page_1_ids.iter().all(|id| !page_2_ids.contains(id)));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_filter_and_paginate_default_collections_only() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let admin_client = ctx.new_token_storage_client(admin);

        let mut collections: Vec<_> = (0..10u8)
            .map(|i| {
                let mut collection =
                    fixture_of_collection(Principal::from_slice(&[i; 1]), &format!("Default {i}"));
                collection.is_default = true;
                collection
            })
            .collect();
        let non_default_collections: Vec<_> = (10..15u8)
            .map(|i| fixture_of_collection(Principal::from_slice(&[i; 1]), &format!("Other {i}")))
            .collect();
        let non_default_ids: Vec<_> = non_default_collections
            .iter()
            .map(|c| c.collection_id)
            .collect();
        collections.extend(non_default_collections);

        admin_client
            .collection_manager_upsert_collections(UpsertCollectionsInput { collections })
            .await
            .unwrap()
            .unwrap();

        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        // Act
        let page_1 = token_storage_client
            .list_collections(ListCollectionsInput {
                start: Some(0),
                limit: Some(5),
                is_default: Some(true),
            })
            .await
            .unwrap();
        let page_2 = token_storage_client
            .list_collections(ListCollectionsInput {
                start: Some(5),
                limit: Some(5),
                is_default: Some(true),
            })
            .await
            .unwrap();
        let page_3 = token_storage_client
            .list_collections(ListCollectionsInput {
                start: Some(10),
                limit: Some(5),
                is_default: Some(true),
            })
            .await
            .unwrap();

        // Assert
        assert_eq!(page_1.len(), 5);
        assert_eq!(page_2.len(), 5);
        assert!(page_3.is_empty());
        assert!(page_1.iter().all(|c| c.is_default));
        assert!(page_2.iter().all(|c| c.is_default));
        let page_1_ids: Vec<_> = page_1.iter().map(|c| c.collection_id).collect();
        let page_2_ids: Vec<_> = page_2.iter().map(|c| c.collection_id).collect();
        assert!(page_1_ids.iter().all(|id| !page_2_ids.contains(id)));
        assert!(
            page_1_ids
                .iter()
                .chain(page_2_ids.iter())
                .all(|id| !non_default_ids.contains(id))
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_collection_by_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let seeded = seed_collections(ctx, 1).await;
        let collection = seeded.first().unwrap();
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());

        // Act
        let result = token_storage_client
            .get_collection_by_id(collection.collection_id)
            .await
            .unwrap()
            .unwrap();

        // Assert
        assert_eq!(result.collection_id, collection.collection_id);
        assert_eq!(result.name, collection.name);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_get_collection_by_id_due_to_unknown_collection() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let unknown_id = Principal::from_slice(&[99; 1]);

        // Act
        let result = token_storage_client
            .get_collection_by_id(unknown_id)
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
