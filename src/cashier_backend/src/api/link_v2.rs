use crate::api::state::get_state;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, GetLinkResp, LinkDto},
    error::CanisterError,
};
use cashier_common::{guard::is_not_anonymous, runtime::IcEnvironment};
use ic_cdk::{api::msg_caller, update};
use log::{debug, info};

/// Creates a new link using the v2 state machine implementation.
/// The link will be in CREATED state if validation passes, else it will return an error.
///
/// # Arguments
/// * `input` - Link creation data
///
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

/// Publishes a link v2, transitioning it from CREATED to ACTIVE state.
/// Only the link creator can publish the link.
///
/// # Arguments
/// * `link_id` - The ID of the link to publish
///
/// # Returns
/// * `Ok(LinkDto)` - The published link data
/// * `Err(CanisterError)` - If publishing fails or unauthorized
#[update(guard = "is_not_anonymous")]
async fn activate_link_v2(link_id: &str) -> Result<LinkDto, CanisterError> {
    info!("[publish_link_v2]");
    debug!("[publish_link_v2] link_id: {link_id}");

    let mut link_v2_service = get_state().link_v2_service;
    link_v2_service.activate_link(msg_caller(), link_id).await
}
