// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use candid::Principal;
use cashier_common::guard::is_not_anonymous;
use ic_cdk::{api::msg_caller, query, update};
use token_storage_types::{
    collection::{
        CollectionDto, CollectionId, EnableCollectionInput, EnableCollectionsInput,
        ListCollectionsInput,
    },
    error::CanisterError,
};

/// Lists collections in the registry, paginated. No auth guard — registry data is public,
/// mirroring `list_tokens`.
/// # Arguments
/// * `input` - Pagination parameters, optionally filtered to only `is_default` collections
/// # Returns
/// * `Vec<CollectionDto>` - The page of collections
#[query]
pub fn list_collections(input: ListCollectionsInput) -> Vec<CollectionDto> {
    let state = get_state();
    state
        .collection_registry
        .list_collections(input.start, input.limit, input.is_default)
}

/// Get a single collection from the registry by id. No auth guard — mirrors `get_token_by_id`.
/// # Returns
/// * `Ok(CollectionDto)` - The collection details if found
/// * `Err(CanisterError::NotFound)` - If the collection doesn't exist in the registry
#[query]
pub fn get_collection_by_id(collection_id: Principal) -> Result<CollectionDto, CanisterError> {
    let state = get_state();
    match state.collection_registry.get_collection(&collection_id) {
        Some(collection) => Ok(CollectionDto::from(collection)),
        None => Err(CanisterError::not_found(
            "Collection",
            &collection_id.to_string(),
        )),
    }
}

/// Retrieves the ids of the collections enabled by the calling user
/// # Returns
/// * `Vec<CollectionId>` - The caller's enabled collection ids
#[query(guard = "is_not_anonymous")]
pub fn user_get_enabled_collections() -> Vec<CollectionId> {
    let state = get_state();
    let user = msg_caller();
    state.user_collection.list_enabled(&user)
}

/// Enables or disables a single collection for the calling user
/// # Arguments
/// * `input` - The collection id and desired enabled state
/// # Returns
/// * `Ok(())` - If the collection exists in the registry and its state was updated
/// * `Err(CanisterError::NotFound)` - If the collection doesn't exist in the registry
#[update(guard = "is_not_anonymous")]
pub fn user_enable_collection(input: EnableCollectionInput) -> Result<(), CanisterError> {
    let mut state = get_state();
    let user = msg_caller();
    state
        .user_collection
        .update_enable(user, input.collection_id, input.is_enabled)
}

/// Enables multiple collections for the calling user in one call. Unknown collection ids
/// are silently dropped.
/// # Arguments
/// * `input` - The collection ids to enable
/// # Returns
/// * `Ok(())`
#[update(guard = "is_not_anonymous")]
pub fn user_enable_collections_batch(input: EnableCollectionsInput) -> Result<(), CanisterError> {
    let mut state = get_state();
    let user = msg_caller();
    state
        .user_collection
        .enable_bulk(user, input.collection_ids)
}
