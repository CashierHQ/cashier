// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use crate::apps::{backoff::BackoffGuard, rate_limit::RateLimitGuard};
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    link_v3::dto::{
        action::{
            CreateActionInputV3, CreateActionResponseV3, ProcessActionInputV3,
            ProcessActionResponseV3,
        },
        link::{
            CreateLinkInputV3, CreateLinkResponseV3, DisableLinkResponseV3,
            GetLinkDetailsResponseV3, GetLinkResponseV3, GetLinksResponseV3,
            SyncAssetBalanceCacheResponseV3,
        },
    },
    repository::keys::RequestLockKey,
    service::link::PaginateInput,
};
use cashier_common::{guard::is_not_anonymous, runtime::IcEnvironment};
use gate_service_types::{GateKey, OpenGateSuccessResult, XTokenExchangeResult};
use ic_cdk::{api::msg_caller, query, update};
use log::{debug, info};

/// Creates a new link V3, optionally with one or more gates.
/// # Arguments
/// * `input` - Link creation data, including optional `gate_keys`
/// # Returns
/// * `Ok(CreateLinkResponseV3)` - The created link data and any registered gates
/// * `Err(CanisterError)` - If link creation fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_create_link_v3(
    input: CreateLinkInputV3,
) -> Result<CreateLinkResponseV3, CanisterError> {
    info!("[user_create_link_v3]");
    debug!("[user_create_link_v3] input: {input:?}");

    let mut request_lock_service = get_state().request_lock_service;
    let mut link_v3_service = get_state().link_v3_service;
    let transaction_manager_v3 = get_state().transaction_manager_v3;
    let token_fee_service = get_state().token_fee_service;
    let token_standard_service = get_state().token_standard_service;
    let token_balance_service = get_state().token_balance_service;
    let gate_service = get_state().gate_service;

    let created_at = get_state().env.time();
    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let key = RequestLockKey::CreateLink {
        user_principal: caller,
    };
    let gate_keys = input.gate_keys.clone();

    let _ = request_lock_service.create(&key, get_state().env.time())?;
    let res = link_v3_service
        .create_link(
            input,
            caller,
            canister_id,
            created_at,
            transaction_manager_v3,
            token_fee_service,
            token_standard_service,
            token_balance_service,
            gate_service,
        )
        .await;
    let _ = request_lock_service.drop(&key);

    let mut link_response = res?;

    link_response.gates = if let Some(keys) = gate_keys.filter(|v| !v.is_empty()) {
        let mut gate_service = get_state().gate_service;
        gate_service
            .add_gates_for_link(&link_response.link.id, keys)
            .await?
    } else {
        vec![]
    };

    Ok(link_response)
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
    let transaction_manager_v3 = get_state().transaction_manager_v3;
    let token_fee_service = get_state().token_fee_service;
    let token_standard_service = get_state().token_standard_service;
    let token_balance_service = get_state().token_balance_service;
    let gate_service = get_state().gate_service;

    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let created_at = get_state().env.time();
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
            created_at,
            transaction_manager_v3,
            token_fee_service,
            token_standard_service,
            token_balance_service,
            gate_service,
            0,
        )
        .await;
    let _ = request_lock_service.drop(&key);

    res
}

/// Processes a created action V3.
/// # Arguments
/// * `input` - Action processing data
/// # Returns
/// * `Ok(ProcessActionResponseV3)` - The processed action data
/// * `Err(CanisterError)` - If action processing fails or validation errors occur
#[update(guard = "is_not_anonymous")]
async fn user_process_action_v3(
    input: ProcessActionInputV3,
) -> Result<ProcessActionResponseV3, CanisterError> {
    info!("[user_process_action_v3]");
    debug!("[user_process_action_v3] input: {input:?}");

    let mut request_lock_service = get_state().request_lock_service;
    let mut link_v3_service = get_state().link_v3_service;
    let transaction_manager_v3 = get_state().transaction_manager_v3;
    let validator_service = get_state().validator_service;
    let executor_service = get_state().executor_service;

    let canister_id = get_state().env.id();
    let caller = msg_caller();
    let key = RequestLockKey::ProcessAction {
        user_principal: caller,
        action_id: input.action_id.clone(),
    };

    let _ = request_lock_service.create(&key, get_state().env.time())?;
    let res = link_v3_service
        .process_action(
            msg_caller(),
            canister_id,
            &input.action_id,
            transaction_manager_v3,
            validator_service,
            executor_service,
        )
        .await;
    let _ = request_lock_service.drop(&key);

    res
}

/// Retrieves a paginated list of links for the caller.
/// # Arguments
/// * `input` - Optional pagination parameters
/// # Returns
/// * `Ok(GetLinksResponseV3)` - A paginated list of the caller's links
/// * `Err(CanisterError)` - If retrieval fails or validation errors occur
#[query(guard = "is_not_anonymous")]
async fn user_get_links_v3(
    input: Option<PaginateInput>,
) -> Result<GetLinksResponseV3, CanisterError> {
    info!("[get_links_v3]");
    debug!("[get_links_v3] input: {input:?}");
    let link_v3_service = get_state().link_v3_service;
    link_v3_service.get_links(msg_caller(), input).await
}

/// Retrieves a specific link by its ID with optional action data.
/// # Arguments
/// * `link_id` - The unique identifier of the link to retrieve
/// * `options` - Optional parameters including action type to include in response
/// # Returns
/// * `Ok(GetLinkResponseV3)` - Link data
/// * `Err(String)` - Error message if link not found or access denied
#[query]
async fn get_link_details_v3(
    link_id: &str,
    options: Option<GetLinkOptions>,
) -> Result<GetLinkResponseV3, CanisterError> {
    info!("[get_link_details_v3]");
    debug!("[get_link_details_v3] link_id: {link_id}, options: {options:?}");

    let link_v3_service = get_state().link_v3_service;
    let transaction_manager_v3 = get_state().transaction_manager_v3;

    link_v3_service
        .get_link_details(msg_caller(), link_id, options, transaction_manager_v3)
        .await
}

/// Syncs the asset balance cache for a link by querying actual token balances.
/// Only the link creator can trigger this.
/// # Arguments
/// * `link_id` - The unique identifier of the link
/// # Returns
/// * `Ok(SyncAssetBalanceCacheResponseV3)` - The updated link data
/// * `Err(CanisterError)` - If link not found, access denied, or balance fetch fails
#[update(guard = "is_not_anonymous")]
async fn user_sync_asset_balance_cache(
    link_id: &str,
) -> Result<SyncAssetBalanceCacheResponseV3, CanisterError> {
    info!("[user_sync_asset_balance_cache]");
    debug!("[user_sync_asset_balance_cache] link_id: {link_id}");

    let mut link_v3_service = get_state().link_v3_service;
    let token_balance_service = get_state().token_balance_service;
    let canister_id = get_state().env.id();
    let caller = msg_caller();

    link_v3_service
        .sync_asset_balance_cache(caller, canister_id, link_id, token_balance_service)
        .await
}

/// Disables a link by its ID
/// # Arguments
/// * `link_id` - The unique identifier of the link to disable
/// # Returns
/// * `Ok(DisableLinkResponseV3)` - Confirmation of link being disabled
/// * `Err(String)` - Error message if link not found, access denied, or already disabled
#[update(guard = "is_not_anonymous")]
fn user_disable_link_v3(link_id: &str) -> Result<DisableLinkResponseV3, CanisterError> {
    info!("[disable_link_v3]");
    debug!("[disable_link_v3] link_id: {link_id}");

    let mut link_v3_service = get_state().link_v3_service;
    link_v3_service.disable_link(msg_caller(), link_id)
}

/// Opens a gate for the caller on the specified link.
/// The caller must provide the gate ID (obtained from `user_get_link_details_v3`) and the
/// correct gate key. On success the open status is cached locally so subsequent
/// `user_create_action_v3` calls do not need an additional inter-canister round-trip.
/// # Arguments
/// * `link_id` - The unique identifier of the link
/// * `gate_id` - The unique identifier of the gate to open
/// * `gate_key` - The key to open the gate (e.g. the password)
/// # Returns
/// * `Ok(OpenGateSuccessResult)` - Gate and updated user status
/// * `Err(CanisterError)` - If the key is wrong or the gate is not found
#[update(guard = "is_not_anonymous")]
async fn user_open_link_gate(
    link_id: String,
    gate_id: String,
    gate_key: GateKey,
) -> Result<OpenGateSuccessResult, CanisterError> {
    info!("[user_open_link_gate]");
    debug!("[user_open_link_gate] link_id: {link_id}, gate_id: {gate_id}");

    let caller = msg_caller();
    let now_ns = get_state().env.time();

    let backoff_service = get_state().backoff_service;
    let mut backoff_guard = BackoffGuard::new(&backoff_service, caller, now_ns)?;

    let mut rate_service = get_state().rate_limit_service;
    let _rate_guard = RateLimitGuard::new(&mut rate_service, caller, now_ns)?;

    backoff_guard.mark_attempted();

    let mut gate_service = get_state().gate_service;
    let result = gate_service
        .open_link_gate(&link_id, &gate_id, caller, gate_key)
        .await;

    if result.is_ok() {
        backoff_guard.on_success();
    }

    result
}

/// Exchanges an X OAuth 2.0 authorization code for the caller's X profile.
/// Proxies the call to gate_service which performs the actual token exchange via HTTP outcall.
/// # Arguments
/// * `code` - The authorization code received from the X OAuth callback
/// # Returns
/// * `Ok(XTokenExchangeResult)` - The authenticated user's X profile and access token
/// * `Err(CanisterError)` - If the token exchange fails
#[update(guard = "is_not_anonymous")]
async fn user_exchange_x_token(code: String) -> Result<XTokenExchangeResult, CanisterError> {
    info!("[user_exchange_x_token]");

    let gate_service = get_state().gate_service;
    gate_service.exchange_x_token(code).await
}

/// Returns link details together with gate metadata and the caller's gate status.
/// # Arguments
/// * `link_id` - The unique identifier of the link
/// * `options` - Optional parameters including action type to include in response
/// # Returns
/// * `Ok(GetLinkDetailsResponseV3)` - Link data with gate info
/// * `Err(CanisterError)` - If link not found or access denied
#[query(guard = "is_not_anonymous")]
async fn user_get_link_details_v3(
    link_id: String,
    options: Option<GetLinkOptions>,
) -> Result<GetLinkDetailsResponseV3, CanisterError> {
    info!("[user_get_link_details_v3]");
    debug!("[user_get_link_details_v3] link_id: {link_id}");

    let caller = msg_caller();
    let link_v3_service = get_state().link_v3_service;
    let transaction_manager_v3 = get_state().transaction_manager_v3;
    let gate_service = get_state().gate_service;

    let base = link_v3_service
        .get_link_details(caller, &link_id, options, transaction_manager_v3)
        .await?;

    let gates = gate_service.get_gates_for_link(&link_id, caller)?;

    Ok(GetLinkDetailsResponseV3 {
        link: base.link,
        action: base.action,
        icrc112_requests: base.icrc112_requests,
        link_user_state: base.link_user_state,
        gates,
    })
}
