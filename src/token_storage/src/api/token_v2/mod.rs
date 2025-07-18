use crate::api::token_v2::types::UpdateTokenBalanceInput;
use crate::services::token_registry::TokenRegistryService;
use crate::services::user_preference::UserPreferenceService;
use crate::types::{TokenDto, TokenId};
use crate::{api::token_v2::types::TokenListResponse, services::user_token::UserTokenService};
use candid::Principal;
use ic_cdk::api::msg_caller;
use ic_cdk::{query, update};

pub mod types;

use types::{AddTokenInput, AddTokensInput, UpdateTokenInput};

fn ensure_not_anonymous() -> Result<String, String> {
    let caller = msg_caller();
    if caller == Principal::anonymous() {
        return Err("Anonymous caller is not allowed".to_string());
    }
    Ok(caller.to_text())
}

fn validate_token_id(token_id: &str) -> Result<(), String> {
    // Check if token ID contains a colon separator
    if !token_id.contains(':') {
        return Err("Invalid token ID format. Expected format: 'CHAIN:token_address'".to_string());
    }

    // Split and validate the parts
    let mut parts = token_id.splitn(2, ':');
    let chain_part = parts.next();
    let address_part = parts.next();

    match (chain_part, address_part) {
        (Some(chain), Some(address)) if !chain.is_empty() && !address.is_empty() => {
            // Validate chain is supported
            match chain {
                "IC" => {
                    // For IC chain, validate the address looks like a principal
                    if address.len() < 5 || !address.contains('-') {
                        return Err("Invalid IC principal format for token address".to_string());
                    }
                }
                _ => {
                    return Err(format!("Unsupported chain type: {}", chain));
                }
            }
        }
        _ => {
            return Err(
                "Invalid token ID format. Expected format: 'CHAIN:token_address'".to_string(),
            );
        }
    }

    Ok(())
}

#[update]
pub async fn add_token(input: AddTokenInput) -> Result<(), String> {
    let user_id = ensure_not_anonymous()?;

    // Validate token ID format
    validate_token_id(&input.token_id)?;

    let token_registry_service = TokenRegistryService::new();

    // Check if token exists in registry, if not, add it
    if token_registry_service.get_token(&input.token_id).is_none() {
        // Token doesn't exist in registry, register it first
        token_registry_service
            .update_token_metadata(&input.token_id)
            .await?;
    }

    let service = UserTokenService::new();
    service.add_token(&user_id, &input.token_id)
}

#[update]
pub async fn add_token_batch(input: AddTokensInput) -> Result<(), String> {
    let user_id = ensure_not_anonymous()?;

    // Validate all token IDs first
    for token_id in &input.token_ids {
        validate_token_id(token_id)?;
    }

    let token_registry_service = TokenRegistryService::new();

    // Check each token and add to registry if it doesn't exist
    for token_id in &input.token_ids {
        if token_registry_service.get_token(token_id).is_none() {
            // Token doesn't exist in registry, register it first
            // Don't fail if registration fails - continue processing
            if let Err(_) = token_registry_service.update_token_metadata(token_id).await {
                // Log the error but continue processing
                // In the future, we might want to collect these errors and return them
                ic_cdk::println!(
                    "Failed to register token {} in registry, continuing...",
                    token_id
                );
            }
        }
    }

    let user_token_service = UserTokenService::new();
    user_token_service.add_tokens(&user_id, &input.token_ids)
}

#[update]
pub async fn update_token_registry(input: AddTokenInput) -> Result<(), String> {
    let _user_id = ensure_not_anonymous()?;

    // Validate token ID format
    validate_token_id(&input.token_id)?;

    let token_registry_service = TokenRegistryService::new();

    // Re-register the token to update its metadata from the ledger
    token_registry_service
        .register_new_token(&input.token_id, None)
        .await?;

    Ok(())
}

#[update]
pub async fn update_token_registry_batch(input: AddTokensInput) -> Result<(), String> {
    let _user_id = ensure_not_anonymous()?;

    // Validate all token IDs first
    for token_id in &input.token_ids {
        validate_token_id(token_id)?;
    }

    let token_registry_service = TokenRegistryService::new();

    // Re-register all tokens to update their metadata from the ledger
    for token_id in &input.token_ids {
        token_registry_service
            .register_new_token(token_id, None)
            .await?;
    }

    Ok(())
}

#[update]
pub fn update_token_enable(input: UpdateTokenInput) -> Result<(), String> {
    let user_id = ensure_not_anonymous()?;

    // Validate token ID format
    validate_token_id(&input.token_id)?;

    let service = UserTokenService::new();
    service.update_token_enable(&user_id, &input.token_id, &input.is_enabled)
}

#[query]
pub fn list_tokens() -> Result<TokenListResponse, String> {
    // Get registry metadata to check version
    let caller = msg_caller();
    let token_registry_service = TokenRegistryService::new();
    let user_preference_service = UserPreferenceService::new();
    let user_token_service = UserTokenService::new();
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

    let user_preferences = user_preference_service.get_preferences(&caller.to_string());

    // Check if user's token list exists
    match user_token_service.get_token_list(&caller.to_string()) {
        Ok(list) => {
            // Token list exists, check if version is outdated
            let need_update_version = list.version < registry_metadata.version;

            // Case 2: If token list is empty, return registry tokens
            if list.enable_list.is_empty() {
                return Ok(TokenListResponse {
                    tokens: token_registry_service
                        .list_tokens()
                        .iter()
                        .map(|registry_token| TokenDto::from(registry_token.clone()))
                        .collect(),
                    need_update_version: true,
                    perference: Some(user_preferences),
                });
            } else {
                // Case 3: User has enabled tokens - create tokens with proper enabled state
                let registry_tokens = token_registry_service.list_tokens();
                let mut filtered_tokens = Vec::new();
                let mut seen_token_ids = std::collections::HashSet::new();

                // First, add enabled tokens from enable_list
                for token_id in &list.enable_list {
                    if let Some(registry_token) = registry_tokens.iter().find(|t| &t.id == token_id)
                    {
                        if seen_token_ids.insert(registry_token.id.clone()) {
                            let mut token_dto = TokenDto::from(registry_token.clone());
                            token_dto.enabled = true; // Mark as enabled
                            filtered_tokens.push(token_dto);
                        }
                    }
                }

                // Then, add all remaining registry tokens with enabled = false
                for registry_token in &registry_tokens {
                    if !seen_token_ids.contains(&registry_token.id) {
                        if seen_token_ids.insert(registry_token.id.clone()) {
                            let token_dto = TokenDto::from(registry_token.clone());
                            filtered_tokens.push(token_dto);
                        }
                    }
                }

                return Ok(TokenListResponse {
                    tokens: filtered_tokens,
                    need_update_version,
                    perference: Some(user_preferences),
                });
            }
        }
        Err(_) => {
            // Case 4: Token list doesn't exist or error occurred - return registry tokens with need_update = true
            return Ok(TokenListResponse {
                tokens: token_registry_service
                    .list_tokens()
                    .iter()
                    .map(|registry_token| TokenDto::from(registry_token.clone()))
                    .collect(),
                need_update_version: true,
                perference: Some(user_preferences),
            });
        }
    }
}

#[update]
pub fn sync_token_list() -> Result<(), String> {
    let caller = msg_caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let user_token_service = UserTokenService::new();
    user_token_service.sync_token_version(&caller.to_string())
}

#[update]
pub fn update_token_balance(input: Vec<UpdateTokenBalanceInput>) -> Result<(), String> {
    let user_id = ensure_not_anonymous()?;
    let service = UserTokenService::new();

    let token_balances: Vec<(TokenId, u128)> = input
        .into_iter()
        .map(|item| (item.token_id, item.balance))
        .collect();

    service.update_bulk_balances(&user_id, token_balances);

    Ok(())
}
