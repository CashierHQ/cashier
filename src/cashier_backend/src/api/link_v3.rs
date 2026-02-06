// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_backend_types::{
    dto::action::{ActionDto, CreateActionInput},
    error::CanisterError,
    link_v3::api_args::{CreateActionV3Input, CreateLinkV3Input, CreateLinkV3Result},
    repository::keys::RequestLockKey,
};
use cashier_common::{guard::is_not_anonymous, runtime::IcEnvironment};
use cashier_shared::types::Action as ActionShared;
use ic_cdk::{api::msg_caller, query, update};
use log::{debug, info};

/// Creates a new link V3
/// # Arguments
/// * `input` - Link creation data
/// # Returns
/// * `Ok(CreateLinkDto)` - The created link data
/// * `Err(CanisterError)` - If link creation fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_create_link_v3(
    input: CreateLinkV3Input,
) -> Result<CreateLinkV3Result, CanisterError> {
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
        .create_link(caller, canister_id, input, created_at)
        .await;
    let _ = request_lock_service.drop(&key);

    res
}

/// Creates a new action V3.
/// # Arguments
/// * `input` - Action creation data
/// # Returns
/// * `Ok(ActionDto)` - The created action data
/// * `Err(CanisterError)` - If action creation fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_create_action_v3(input: CreateActionV3Input) -> Result<ActionShared, CanisterError> {
    info!("[create_action_v3]");
    debug!("[create_action_v3] input: {input:?}");

    let mut request_lock_service = get_state().request_lock_service;
    let mut link_v3_service = get_state().link_v3_service;
    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let key = RequestLockKey::CreateAction {
        user_principal: caller,
        link_id: input.link_id.clone(),
        action_type: input.action.action_type.clone().to_string(),
    };

    let _ = request_lock_service.create(&key, get_state().env.time())?;
    let res = link_v3_service
        .create_action(caller, canister_id, &input.link_id, input.action)
        .await;
    let _ = request_lock_service.drop(&key);

    res
}
