// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use cashier_backend_types::{
    dto::{
        action::{ActionDto, CreateActionInput, ProcessActionInput},
        link::{CreateLinkInput, GetLinkResp, LinkDto},
    },
    error::CanisterError,
};
use cashier_common::{guard::is_not_anonymous, runtime::IcEnvironment};
use ic_cdk::{api::msg_caller, update};
use log::{debug, info};

/// Creates a new link V2
/// # Arguments
/// * `input` - Link creation data
/// # Returns
/// * `Ok(GetLinkResp)` - The created link data
/// * `Err(CanisterError)` - If link creation fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn create_link_v2(input: CreateLinkInput) -> Result<GetLinkResp, CanisterError> {
    info!("[create_link_v2]");
    debug!("[create_link_v2] input: {input:?}");

    let mut link_v2_service = get_state().link_v2_service;
    let created_at = get_state().env.time();
    let canister_id = get_state().env.id();
    link_v2_service
        .create_link(msg_caller(), canister_id, input, created_at)
        .await
}

/// Activate a link v2, transitioning it from CREATED to ACTIVE state.
/// Only the link creator can activate the link.
/// # Arguments
/// * `link_id` - The ID of the link to activate
/// # Returns
/// * `Ok(LinkDto)` - The activated link data
/// * `Err(CanisterError)` - If activation fails or unauthorized
#[update(guard = "is_not_anonymous")]
async fn activate_link_v2(link_id: &str) -> Result<LinkDto, CanisterError> {
    info!("[activate_link_v2]");
    debug!("[activate_link_v2] link_id: {link_id}");

    let mut link_v2_service = get_state().link_v2_service;
    let canister_id = get_state().env.id();
    link_v2_service
        .activate_link(msg_caller(), link_id, canister_id)
        .await
}

async fn create_action_v2(input: CreateActionInput) -> Result<ActionDto, CanisterError> {
    info!("[create_action_v2]");
    debug!("[create_action_v2] input: {input:?}");

    let mut link_v2_service = get_state().link_v2_service;
    let canister_id = get_state().env.id();
    link_v2_service
        .create_action(msg_caller(), canister_id, &input.link_id, input.action_type)
        .await
}

async fn process_action_v2(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
    info!("[process_action_v2]");
    debug!("[process_action_v2] input: {input:?}");

    let mut link_v2_service = get_state().link_v2_service;
    let canister_id = get_state().env.id();
    link_v2_service
        .process_action(msg_caller(), canister_id, &input.action_id)
        .await
}
