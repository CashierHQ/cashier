// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_cdk::{api::msg_caller, update};
use log::{debug, info};
use token_storage_types::{
    auth::Permission,
    collection::{UpsertCollectionsInput, UpsertCollectionsResult},
    error::CanisterError,
};

use crate::api::state::get_state;

/// Upserts a batch of collections into the registry. Intended to be called by the offchain
/// collection-sync script, authenticated as a principal holding `Permission::Admin` or
/// `Permission::CollectionManager`.
#[update]
pub fn collection_manager_upsert_collections(
    input: UpsertCollectionsInput,
) -> Result<UpsertCollectionsResult, CanisterError> {
    info!("[collection_manager_upsert_collections]");
    debug!(
        "[collection_manager_upsert_collections] collections: {}",
        input.collections.len()
    );

    let mut state = get_state();
    let caller = msg_caller();

    state
        .auth_service
        .check_has_any_permission(&caller, &[Permission::Admin, Permission::CollectionManager])
        .map_err(|e| format!("{e:?}"))?;

    let upserted = state
        .collection_registry
        .upsert_collections(input.collections)?;
    Ok(UpsertCollectionsResult { upserted })
}
