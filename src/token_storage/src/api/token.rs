use crate::api::state::get_state;
use candid::Principal;
use ic_cdk::api::msg_caller;
use ic_cdk::{query, update};

use log::{debug, info, warn};
use token_storage_types::TokenId;
use token_storage_types::token::{
    AddTokenInput, AddTokensInput, TokenDto, TokenListResponse, UpdateTokenBalanceInput,
    UpdateTokenInput,
};

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

#[update]
pub async fn user_add_token(input: AddTokenInput) -> Result<(), String> {
    info!("[user_add_token]");
    debug!("[user_add_token] input: {input:?}");

    let user_id = not_anonymous_caller();

    // Handle optional index_id - only parse if provided and not empty
    let index_pid = match &input.index_id {
        Some(index_str) if !index_str.is_empty() => Some(
            Principal::from_text(index_str).map_err(|_| "Invalid index ID format".to_string())?,
        ),
        _ => None, // If not provided or empty, use None
    };

    let state = get_state();
    let mut token_registry_service = state.token_registry;

    // Check if token exists in registry, if not, add it
    if token_registry_service.get_token(&input.token_id).is_none() {
        // Token doesn't exist in registry, register it first
        token_registry_service
            .register_new_token(input.token_id.clone(), index_pid)
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

/// Add multiple tokens to the user's list
///
/// ToDo: this function is not atomic can leave the state in an inconsistent state
#[update]
pub async fn user_add_token_batch(input: AddTokensInput) -> Result<(), String> {
    info!("[user_add_token_batch]");
    let user_id = not_anonymous_caller();

    debug!("[user_add_token_batch] user: {user_id}, input: {input:?}");

    let state = get_state();
    let mut token_registry_service = state.token_registry;

    // Check each token and add to registry if it doesn't exist
    for token_id in &input.token_ids {
        if token_registry_service.get_token(token_id).is_none() {
            // Token doesn't exist in registry, register it first
            // Don't fail if registration fails - continue processing
            if token_registry_service
                .register_new_token(token_id.clone(), None)
                .await
                .is_err()
            {
                // Log the error but continue processing
                // In the future, we might want to collect these errors and return them
                warn!(
                    "Failed to register token {:?} in registry, continuing...",
                    token_id
                );
            }
        }
    }

    let mut user_token_service = state.user_token;
    user_token_service.add_tokens(user_id, input.token_ids)
}

#[update]
pub async fn user_update_token_registry(input: AddTokenInput) -> Result<(), String> {
    info!("[user_update_token_registry]");
    debug!("[user_update_token_registry] input: {input:?}");

    let _user_id = not_anonymous_caller();
    let state = get_state();
    let mut token_registry_service = state.token_registry;

    // Re-register the token to update its metadata from the ledger
    token_registry_service
        .update_token_metadata(input.token_id)
        .await
        .expect("Failed to update token metadata");

    Ok(())
}

/// Update the metadata for multiple tokens
///
/// ToDo: this function is not atomic can leave the state in an inconsistent state
#[update]
pub async fn user_update_token_registry_batch(input: AddTokensInput) -> Result<(), String> {
    info!("[user_update_token_registry_batch]");
    debug!("[user_update_token_registry_batch] input: {input:?}");

    let _user_id = not_anonymous_caller();

    let state = get_state();
    let mut token_registry_service = state.token_registry;

    // Re-register all tokens to update their metadata from the ledger
    for token_id in input.token_ids {
        token_registry_service
            .update_token_metadata(token_id)
            .await
            .expect("Failed to update token metadata");
    }

    Ok(())
}

#[update]
pub fn user_update_token_enable(input: UpdateTokenInput) -> Result<(), String> {
    info!("[user_update_token_enable]");
    debug!("[user_update_token_enable] input: {input:?}");

    let user_id = not_anonymous_caller();

    let state = get_state();
    let mut user_token = state.user_token;
    user_token
        .update_token_enable(user_id, input.token_id, input.is_enabled)
        .expect("Failed to update token enable");
    Ok(())
}

/// Lists the tokens in the registry for the caller
#[query]
pub fn list_tokens() -> Result<TokenListResponse, String> {
    debug!("[list_tokens]");

    // Get registry metadata to check version
    let caller = msg_caller();
    let state = get_state();
    let token_registry_service = state.token_registry;
    let user_preference_service = state.user_preference;
    let user_token_service = state.user_token;
    let registry_metadata = token_registry_service.get_metadata();

    // Check if user preferences exist

    if caller == Principal::anonymous() {
        // Anonymous users get registry tokens and don't need updates or initialization
        return Ok(TokenListResponse {
            tokens: token_registry_service
                .list_tokens()
                .iter()
                .map(|registry_token| TokenDto::from(registry_token.clone()))
                .collect(),
            need_update_version: false,
            perference: None,
        });
    }

    let user_preferences = user_preference_service.get_preferences(&caller);

    // Get user's cached balances for enriching token data
    let user_balances = user_token_service.get_all_user_balances(&caller);

    // Check if user's token list exists
    match user_token_service.get_token_list(&caller) {
        Ok(list) => {
            // Token list exists, check if version is outdated
            let need_update_version = list.version < registry_metadata.version;

            // Case 2: If token list is empty, return registry tokens
            if list.enable_list.is_empty() {
                Ok(TokenListResponse {
                    tokens: token_registry_service
                        .list_tokens()
                        .iter()
                        .map(|registry_token| {
                            let mut token_dto = TokenDto::from(registry_token.clone());
                            // Enrich with balance if available
                            token_dto.balance = user_balances
                                .get(&registry_token.details.token_id())
                                .cloned();
                            token_dto
                        })
                        .collect(),
                    need_update_version: true,
                    perference: Some(user_preferences),
                })
            } else {
                // Case 3: User has enabled tokens - create tokens with proper enabled state
                let registry_tokens = token_registry_service.list_tokens();
                let mut filtered_tokens = Vec::new();
                let mut seen_token_ids = std::collections::HashSet::new();

                // First, add enabled tokens from enable_list
                for token_id in list.enable_list {
                    if let Some(registry_token) = registry_tokens
                        .iter()
                        .find(|t| t.details.token_id() == token_id)
                        && seen_token_ids.insert(registry_token.details.token_id())
                    {
                        let mut token_dto = TokenDto::from(registry_token.clone());
                        token_dto.enabled = true; // Mark as enabled
                        // Enrich with balance if available
                        token_dto.balance = user_balances
                            .get(&registry_token.details.token_id())
                            .cloned();
                        filtered_tokens.push(token_dto);
                    }
                }

                // Then, add all remaining registry tokens with enabled = false
                for registry_token in &registry_tokens {
                    let token_id = registry_token.details.token_id();
                    if !seen_token_ids.contains(&token_id)
                        && seen_token_ids.insert(token_id.clone())
                    {
                        let mut token_dto = TokenDto::from(registry_token.clone());
                        // Enrich with balance if available
                        token_dto.balance = user_balances.get(&token_id).cloned();
                        filtered_tokens.push(token_dto);
                    }
                }

                Ok(TokenListResponse {
                    tokens: filtered_tokens,
                    need_update_version,
                    perference: Some(user_preferences),
                })
            }
        }
        Err(_) => {
            // Case 4: Token list doesn't exist or error occurred - return registry tokens with need_update = true
            Ok(TokenListResponse {
                tokens: token_registry_service
                    .list_tokens()
                    .iter()
                    .map(|registry_token| {
                        let mut token_dto = TokenDto::from(registry_token.clone());
                        // Enrich with balance if available
                        token_dto.balance = user_balances
                            .get(&registry_token.details.token_id())
                            .cloned();
                        token_dto
                    })
                    .collect(),
                need_update_version: true,
                perference: Some(user_preferences),
            })
        }
    }
}

#[update]
pub fn user_sync_token_list() -> Result<(), String> {
    info!("[user_sync_token_list]");

    let caller = not_anonymous_caller();

    let state = get_state();
    let mut user_token_service = state.user_token;
    user_token_service
        .sync_token_version(caller)
        .expect("Failed to sync token list");

    Ok(())
}

#[update]
pub fn user_update_token_balance(input: Vec<UpdateTokenBalanceInput>) -> Result<(), String> {
    info!("[user_update_token_balance]");
    debug!("[user_update_token_balance] input: {input:?}");

    let user_id = not_anonymous_caller();

    let state = get_state();
    let mut user_token = state.user_token;

    let token_balances: Vec<(TokenId, u128)> = input
        .into_iter()
        .map(|item| (item.token_id, item.balance))
        .collect();

    user_token.update_bulk_balances(user_id, token_balances);

    Ok(())
}
