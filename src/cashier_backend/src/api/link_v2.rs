// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_backend_types::{
    dto::{
        action::{ActionDto, CreateActionInput},
        link::{CreateLinkInput, GetLinkOptions, GetLinkResp, LinkDto},
    },
    error::CanisterError,
    link_v2::dto::{CreateLinkDto, ProcessActionDto, ProcessActionV2Input},
    repository::keys::RequestLockKey,
    service::link::{PaginateInput, PaginateResult},
};
use cashier_common::{guard::is_not_anonymous, runtime::IcEnvironment};
use ic_cdk::{api::msg_caller, query, update};
use log::{debug, info};

/// Creates a new link V2
/// # Arguments
/// * `input` - Link creation data
/// # Returns
/// * `Ok(CreateLinkDto)` - The created link data
/// * `Err(CanisterError)` - If link creation fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_create_link_v2(input: CreateLinkInput) -> Result<CreateLinkDto, CanisterError> {
    info!("[user_create_link_v2]");
    debug!("[user_create_link_v2] input: {input:?}");

    let mut request_lock_service = get_state().request_lock_service;
    let mut link_v2_service = get_state().link_v2_service;
    let created_at = get_state().env.time();
    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let key = RequestLockKey::CreateLink {
        user_principal: caller,
    };

    let _ = request_lock_service.create(&key, created_at);
    let res = link_v2_service
        .create_link(msg_caller(), canister_id, input, created_at)
        .await;
    let _ = request_lock_service.drop(&RequestLockKey::CreateLink {
        user_principal: caller,
    });

    res
}

/// Disables an existing link V2
/// # Arguments
/// * `link_id` - The ID of the link to disable
/// # Returns
/// * `Ok(LinkDto)` - The disabled link data
/// * `Err(CanisterError)` - If disabling fails or unauthorized
#[update(guard = "is_not_anonymous")]
async fn user_disable_link_v2(link_id: &str) -> Result<LinkDto, CanisterError> {
    info!("[disable_link_v2]");
    debug!("[disable_link_v2] link_id: {link_id}");

    let mut link_v2_service = get_state().link_v2_service;
    link_v2_service.disable_link(msg_caller(), link_id).await
}

/// Creates a new action V2.
/// # Arguments
/// * `input` - Action creation data
/// # Returns
/// * `Ok(ActionDto)` - The created action data
/// * `Err(CanisterError)` - If action creation fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_create_action_v2(input: CreateActionInput) -> Result<ActionDto, CanisterError> {
    info!("[create_action_v2]");
    debug!("[create_action_v2] input: {input:?}");

    let mut request_lock_service = get_state().request_lock_service;
    let mut link_v2_service = get_state().link_v2_service;
    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let key = RequestLockKey::CreateAction {
        user_principal: caller,
        link_id: input.link_id.clone(),
        action_type: input.action_type.clone().to_string(),
    };

    let _ = request_lock_service.create(&key, get_state().env.time());
    let res = link_v2_service
        .create_action(msg_caller(), canister_id, &input.link_id, input.action_type)
        .await;
    let _ = request_lock_service.drop(&key);

    res
}

/// Processes a created action V2.
/// # Arguments
/// * `input` - Action processing data
/// # Returns
/// * `Ok(ProcessActionDto)` - The processed action data
/// * `Err(CanisterError)` - If action processing fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_process_action_v2(
    input: ProcessActionV2Input,
) -> Result<ProcessActionDto, CanisterError> {
    info!("[user_process_action_v2]");
    debug!("[user_process_action_v2] input: {input:?}");

    let mut request_lock_service = get_state().request_lock_service;
    let mut link_v2_service = get_state().link_v2_service;
    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let key = RequestLockKey::ProcessAction {
        user_principal: caller,
        action_id: input.action_id.clone(),
    };

    let _ = request_lock_service.create(&key, get_state().env.time());
    let res = link_v2_service
        .process_action(msg_caller(), canister_id, &input.action_id)
        .await;
    let _ = request_lock_service.drop(&key);

    res
}

/// Retrieves a paginated list of links created by the authenticated caller.
///
/// This endpoint requires the caller to be authenticated (non-anonymous) and returns
/// only the links that were created by the calling principal.
///
/// # Arguments
/// * `input` - Optional pagination parameters (page size, offset, etc.)
///
/// # Returns
/// * `Ok(PaginateResult<LinkDto>)` - Paginated list of links owned by the caller
/// * `Err(CanisterError)` - Error message if retrieval fails
#[query(guard = "is_not_anonymous")]
async fn user_get_links_v2(
    input: Option<PaginateInput>,
) -> Result<PaginateResult<LinkDto>, CanisterError> {
    info!("[get_links_v2]");
    debug!("[get_links_v2] input: {input:?}");

    let link_v2_service = get_state().link_v2_service;
    link_v2_service.get_links(msg_caller(), input).await
}

/// Retrieves a specific link by its ID with optional action data.
///
/// This endpoint is accessible to both anonymous and authenticated users. The response
/// includes the link details and optionally associated action data based on the caller's
/// permissions and the requested action type.
///
/// # Arguments
/// * `link_id` - The unique identifier of the link to retrieve
/// * `options` - Optional parameters including action type to include in response
///
/// # Returns
/// * `Ok(LinkDto)` - Link data
/// * `Err(String)` - Error message if link not found or access denied
#[query]
async fn get_link_details_v2(
    link_id: &str,
    options: Option<GetLinkOptions>,
) -> Result<GetLinkResp, CanisterError> {
    info!("[get_link_details_v2]");
    debug!("[get_link_details_v2] link_id: {link_id}, options: {options:?}");

    let link_v2_service = get_state().link_v2_service;
    link_v2_service
        .get_link_details(msg_caller(), link_id, options)
        .await
}
