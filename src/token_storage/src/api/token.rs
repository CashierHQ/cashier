// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_cdk::{
    api::{msg_caller, time},
    query, update,
};
use log::{debug, info, warn};
use token_storage_types::{
    TokenId,
    error::CanisterError,
    token::{AddTokenInput, AddTokensInput, TokenDto, TokenListResponse, UpdateTokenInput},
};

use crate::api::state::get_state;

/// Returns the principal of the caller, ensuring it is not anonymous.
///
/// # Panics
///
/// Panics if the caller is anonymous, indicating that anonymous calls
/// are not allowed.
fn not_anonymous_caller() -> Principal {
    let caller = msg_caller();
    if caller == Principal::anonymous() {
        panic!("AnonimousUserNotAllowed");
    }
    caller
}

/// Add new token to the registry
/// # Arguments
/// * `input` - The token to add
/// # Returns
/// * `Ok(())` - If the token was successfully added
/// * `Err(CanisterError)` - An error message if the token could not be added
#[update]
pub async fn user_add_token(input: AddTokenInput) -> Result<(), CanisterError> {
    info!("[user_add_token]");
    debug!("[user_add_token] input: {input:?}");

    let user_id = not_anonymous_caller();
    let updated_at = time();

    // Handle optional index_id - only parse if provided and not empty
    let index_pid = match &input.index_id {
        Some(index_str) if !index_str.is_empty() => Some(
            Principal::from_text(index_str).map_err(|_| "Invalid index ID format".to_string())?,
        ),
        _ => None, // If not provided or empty, use None
    };

    let state = get_state();
    let mut token_registry_service = state.token_registry;
    let token_metadata_fetcher = state.token_metadata_fetcher;

    // Check if token exists in registry, if not, add it
    if token_registry_service.get_token(&input.token_id).is_none() {
        // Token doesn't exist in registry, register it first
        token_registry_service
            .register_new_token(
                input.token_id.clone(),
                index_pid,
                input.is_rune,
                input.rune_info,
                updated_at,
                &token_metadata_fetcher,
            )
            .await
            .expect("Failed to register token in registry");
    }

    let mut user_token_service = state.user_token;
    info!("Adding token {:?} for user {}", input.token_id, user_id);
    user_token_service
        .add_token(user_id, input.token_id)
        .expect("Failed to add token");
    Ok(())
}

/// Add new tokens to the registry in batch
/// # Arguments
/// * `input` - The tokens to add
/// # Returns
/// * `Ok(())` - If the tokens were successfully added
/// * `Err(CanisterError)` - An error message if the tokens could not be
#[update]
pub async fn user_add_token_batch(input: AddTokensInput) -> Result<(), CanisterError> {
    info!("[user_add_token_batch]");
    let user_id = not_anonymous_caller();
    let updated_at = time();

    debug!("[user_add_token_batch] user: {user_id}, input: {input:?}");

    let state = get_state();
    let mut token_registry_service = state.token_registry;
    let token_metadata_fetcher = state.token_metadata_fetcher;

    // Check each token and add to registry if it doesn't exist
    for item in &input.token_ids {
        if token_registry_service.get_token(&item.token_id).is_none() {
            // Token doesn't exist in registry, register it first
            // Don't fail if registration fails - continue processing
            if token_registry_service
                .register_new_token(
                    item.token_id.clone(),
                    None,
                    item.is_rune,
                    item.rune_info.clone(),
                    updated_at,
                    &token_metadata_fetcher,
                )
                .await
                .is_err()
            {
                // Log the error but continue processing
                // In the future, we might want to collect these errors and return them
                warn!(
                    "Failed to register token {:?} in registry, continuing...",
                    item.token_id
                );
            }
        }
    }

    let token_ids: Vec<TokenId> = input.token_ids.into_iter().map(|i| i.token_id).collect();
    let mut user_token_service = state.user_token;
    user_token_service.add_tokens(user_id, token_ids)
}

/// Update a token's enabled state for the user
/// # Arguments
/// * `input` - The token ID and new enabled state
/// # Returns
/// * `Ok(())` - If the token's enabled state was successfully updated
/// * `Err(CanisterError)` - An error message if the token's enabled state could not be updated
#[update]
pub fn user_update_token_enable(input: UpdateTokenInput) -> Result<(), CanisterError> {
    info!("[user_update_token_enable]");
    debug!("[user_update_token_enable] input: {input:?}");

    let user_id = not_anonymous_caller();

    let state = get_state();
    let mut user_token = state.user_token;
    user_token.update_token_enable(user_id, input.token_id, input.is_enabled)?;
    Ok(())
}

/// Lists the tokens in the registry for the caller
/// # Returns
/// * `Ok(TokenListResponse)` - The list of tokens and related metadata
/// * `Err(CanisterError)` - An error message if the tokens could not be retrieved
#[query]
pub fn list_tokens() -> Result<TokenListResponse, CanisterError> {
    debug!("[list_tokens]");

    let caller = msg_caller();
    let state = get_state();
    let token_registry_service = state.token_registry;
    let user_preference_service = state.user_preference;
    let user_token_service = state.user_token;

    if caller == Principal::anonymous() {
        return Ok(token_registry_service.list_tokens(caller, None, None));
    }

    let user_preferences = Some(user_preference_service.get_preferences(&caller));
    let user_token_list = user_token_service.get_token_list(&caller).ok();

    Ok(token_registry_service.list_tokens(caller, user_preferences, user_token_list))
}

/// Sync the user's token list with the registry, adding any new tokens from the registry to the user's list
/// # Returns
/// * `Ok(())` - If the token list was successfully synced
/// * `Err(CanisterError)` - An error message if the token list could not be synced
#[update]
pub fn user_sync_token_list() -> Result<(), CanisterError> {
    info!("[user_sync_token_list]");

    let caller = not_anonymous_caller();

    let state = get_state();
    let mut user_token_service = state.user_token;
    user_token_service.sync_token_version(caller)?;

    Ok(())
}

/// Get token from registry by token id
/// # Arguments
/// * `ledger_id` - The principal ID of the ledger associated with the token
/// # Returns
/// * Ok(TokenDto) - The token details if found
/// * Err(CanisterError) - An error message if the token is not found
#[query]
pub fn get_token_by_id(ledger_id: Principal) -> Result<TokenDto, CanisterError> {
    debug!("[get_token_registry] token_id: {ledger_id:?}");

    let state = get_state();
    let token_registry_service = state.token_registry;
    let token_id = TokenId::IC { ledger_id };

    match token_registry_service.get_token(&token_id) {
        Some(registry_token) => Ok(TokenDto::from(registry_token)),
        None => Err(CanisterError::NotFound(format!(
            "Token with id '{token_id:?}' not found in registry"
        ))),
    }
}
