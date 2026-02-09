// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::dto::{
        action::{CreateActionInputV3, CreateActionResponseV3},
        link::CreateLinkInputV3,
    },
    repository::keys::RequestLockKey,
};
use cashier_common::{guard::is_not_anonymous, runtime::IcEnvironment};
use ic_cdk::{api::msg_caller, update};
use log::{debug, info};

/// Creates a new link V3
/// # Arguments
/// * `input` - Link creation data
/// # Returns
/// * `Ok(CreateLinkResponse)` - The created link data
/// * `Err(CanisterError)` - If link creation fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_create_link_v3(
    input: CreateLinkInputV3,
) -> Result<CreateActionResponseV3, CanisterError> {
    info!("[user_create_link_v3]");
    debug!("[user_create_link_v3] input: {input:?}");

    let mut request_lock_service = get_state().request_lock_service;
    let mut link_v3_service = get_state().link_v3_service;
    let created_at = get_state().env.time();
    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let key = RequestLockKey::CreateLink {
        user_principal: caller,
    };

    let _ = request_lock_service.create(&key, get_state().env.time())?;
    let res = link_v3_service
        .create_link(input, caller, canister_id, created_at)
        .await;
    let _ = request_lock_service.drop(&key);

    res
}

/// Creates a new action V3.
/// # Arguments
/// * `input` - Action creation data
/// # Returns
/// * `Ok(CreateActionResponse)` - The created action data
/// * `Err(CanisterError)` - If action creation fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_create_action_v3(
    input: CreateActionInputV3,
) -> Result<CreateActionResponseV3, CanisterError> {
    info!("[create_action_v3]");
    debug!("[create_action_v3] input: {input:?}");

    let mut request_lock_service = get_state().request_lock_service;
    let mut link_v3_service = get_state().link_v3_service;
    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let created_at_ts = get_state().env.time();
    let key = RequestLockKey::CreateAction {
        user_principal: caller,
        link_id: input.link_id.clone(),
        action_type: input.action.action_type.clone().to_string(),
    };

    let _ = request_lock_service.create(&key, get_state().env.time())?;
    let res = link_v3_service
        .create_action(
            &input.link_id,
            input.action,
            caller,
            canister_id,
            created_at_ts,
        )
        .await;
    let _ = request_lock_service.drop(&key);

    res
}
