// File: src/token_storage/src/api.rs
use candid::Principal;
use ic_cdk::{query, update};

use crate::{
    ext::icrc::Service,
    repository::{
        balance_cache::BalanceCacheRepository, token_registry::TokenRegistryRepository,
        user_preference::UserPreferenceRepository, user_token::TokenRepository,
    },
    types::{
        AddTokenInput, Chain, RegisterTokenInput, RegistryToken, RegistryTokenDto,
        RemoveTokenInput, TokenDto, TokenId, UserFiltersInput, UserPreference,
    },
};

#[query]
pub fn list_registry_tokens() -> Result<Vec<RegistryTokenDto>, String> {
    let registry = TokenRegistryRepository::new();
    let tokens = registry.list_tokens();

    let result = tokens
        .into_iter()
        .map(|token| RegistryTokenDto {
            id: token.id,
            icrc_ledger_id: token.icrc_ledger_id,
            icrc_index_id: token.icrc_index_id,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chain: token.chain.to_str(),
        })
        .collect();

    Ok(result)
}

// User Token Management APIs
// if token is not found, add it to registry
#[update]
pub async fn add_token(input: AddTokenInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let token_id = match input.ledger_id.clone() {
        Some(id) => {
            // Generate token ID if not provided
            let chain = crate::types::Chain::from_str(&input.chain)
                .map_err(|e| format!("Invalid chain: {}", e))?;

            crate::types::RegistryToken::generate_id(&chain, Some(&id))
                .map_err(|e| format!("Failed to generate token ID: {}", e))?
        }
        None => {
            return Err("Ledger ID is required for IC chain".to_string());
        }
    };

    let registry = TokenRegistryRepository::new();
    let repository = TokenRepository::new();

    if registry.get_token(&token_id).is_none() {
        let ledger_pid = input
            .ledger_id
            .ok_or("Ledger ID is required for IC chain")?;

        // Use metadata from input if provided, otherwise fetch from service
        let (symbol, name, decimals) = (
            input.symbol.unwrap(),
            input.name.unwrap(),
            input.decimals.unwrap(),
        );

        let chain = Chain::from_str(&input.chain)?;
        let token_id = RegistryToken::generate_id(&chain, Some(&ledger_pid))?;
        registry
            .register_token(RegisterTokenInput {
                id: token_id.clone(),
                chain: input.chain,
                ledger_id: Some(ledger_pid),
                index_id: input.index_id,
                symbol,
                name,
                decimals,
                enabled_by_default: false,
            })
            .map_err(|e| format!("Failed to register token: {}", e))?;

        let _ = repository.add_token(caller.to_text(), token_id)?;
        let _ = repository.sync_registry_tokens(&caller.to_text())?;

        Ok(())
    } else {
        return Err(format!(
            "Token with ID {} already exists in registry",
            token_id
        ));
    }
}

#[update]
pub fn remove_token(input: RemoveTokenInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let repository = TokenRepository::new();
    repository.remove_token(&caller.to_text(), &input.token_id)
}

#[query]
pub fn list_tokens() -> Result<Vec<TokenDto>, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let repository = TokenRepository::new();
    let balance_cache = BalanceCacheRepository::new();

    let tokens = repository.list_tokens(&caller.to_text());
    let balances = balance_cache
        .get_all_balances(&caller.to_text())
        .into_iter()
        .collect::<std::collections::HashMap<_, _>>();

    // Add balance information to tokens
    let result = tokens
        .into_iter()
        .map(|mut token| {
            if let Some(balance) = balances.get(&token.get_address_from_id()) {
                token.balance = Some(balance.clone());
            }
            token
        })
        .collect();

    Ok(result)
}

// User Preference APIs
#[query]
pub fn get_user_preference() -> Result<UserPreference, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let user_preference = UserPreferenceRepository::new();
    let result = user_preference.get(&caller.to_text());

    Ok(result)
}

#[update]
pub fn update_user_filters(input: UserFiltersInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let user_preference = UserPreferenceRepository::new();
    let old_record = user_preference.get(&caller.to_text());

    // Update only the filter-related fields
    let mut updated_record = old_record.clone();

    if let Some(hide_zero) = input.hide_zero_balance {
        updated_record.hide_zero_balance = hide_zero;
    }

    if let Some(hide_unknown) = input.hide_unknown_token {
        updated_record.hide_unknown_token = hide_unknown;
    }

    if let Some(chains) = input.selected_chain {
        let mut chain_enums = Vec::with_capacity(chains.len());
        for chain_str in chains {
            match Chain::from_str(&chain_str) {
                Ok(chain) => chain_enums.push(chain),
                Err(e) => return Err(e),
            }
        }

        // Only update if at least one valid chain is provided
        if !chain_enums.is_empty() {
            updated_record.selected_chain = chain_enums;
        }
    }

    user_preference.update(caller.to_text(), updated_record);
    Ok(())
}

#[update]
pub fn toggle_token_visibility(token_id: String, hidden: bool) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let user_preference = UserPreferenceRepository::new();
    let mut preferences = user_preference.get(&caller.to_text());

    ic_cdk::println!(
        "Toggling token visibility for user: {}, token_id: {}, hidden: {}",
        caller.to_text(),
        token_id,
        hidden
    );

    if hidden {
        // Add token to hidden list if not already there (deduplicate)
        if !preferences.hidden_tokens.contains(&token_id) {
            preferences.hidden_tokens.push(token_id);
        }
    } else {
        // Remove token from hidden list
        preferences.hidden_tokens.retain(|id| id != &token_id);
    }

    ic_cdk::println!(
        "Toggling token visibility for user: {}, preferences: {:#?}",
        caller.to_text(),
        preferences
    );

    user_preference.update(caller.to_text(), preferences);
    Ok(())
}

// Batch toggle multiple tokens at once for efficiency
#[update]
pub fn batch_toggle_token_visibility(tokens: Vec<(String, bool)>) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let user_preference = UserPreferenceRepository::new();
    let mut preferences = user_preference.get(&caller.to_text());

    for (token_id, hidden) in tokens {
        if hidden {
            // Add token to hidden list if not already there (deduplicate)
            if !preferences.hidden_tokens.contains(&token_id) {
                preferences.hidden_tokens.push(token_id);
            }
        } else {
            // Remove token from hidden list
            preferences.hidden_tokens.retain(|id| id != &token_id);
        }
    }

    user_preference.update(caller.to_text(), preferences);
    Ok(())
}

// Balance Cache APIs
#[update]
pub fn update_token_balance(token_id: String, balance: u128) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    // Verify token exists
    let registry = TokenRegistryRepository::new();
    if registry.get_token(&token_id).is_none() {
        return Err(format!("Token with ID {} not found in registry", token_id));
    }

    let balance_cache = BalanceCacheRepository::new();
    balance_cache.update_balance(caller.to_text(), token_id, balance);

    Ok(())
}

#[update]
pub fn update_bulk_balances(token_balances: Vec<(String, u128)>) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    ic_cdk::println!("Updating bulk balances for caller: {:#?}", token_balances);

    let balance_cache = BalanceCacheRepository::new();
    balance_cache.update_bulk_balances(caller.to_text(), token_balances);

    Ok(())
}

// Init and first login helper
#[update]
pub fn initialize_user_tokens() -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    let token_repository = TokenRepository::new();
    let user_preference = UserPreferenceRepository::new();

    let default_perference = UserPreference::default();

    // Add default tokens if user has no tokens yet
    token_repository.add_default_tokens(&caller.to_text());
    user_preference.add(caller.to_text(), default_perference);

    Ok(())
}

/// Add multiple tokens in a single call for efficiency
#[update]
pub async fn add_tokens(input: Vec<AddTokenInput>) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allowed for anonymous calls".to_string());
    }

    if input.is_empty() {
        return Err("No tokens provided".to_string());
    }

    let start_ts = ic_cdk::api::time();

    let registry = TokenRegistryRepository::new();
    let repository = TokenRepository::new();
    let mut token_ids_to_add = Vec::with_capacity(input.len());
    let mut register_inputs = Vec::with_capacity(input.len());

    // First pass: generate token IDs and prepare registration data
    for token_input in input {
        // Skip tokens without ledger ID
        let Some(ledger_pid) = token_input.ledger_id.clone() else {
            continue;
        };

        // Generate token ID more efficiently
        let chain = match Chain::from_str(&token_input.chain) {
            Ok(chain) => chain,
            Err(e) => {
                ic_cdk::println!("Invalid chain {}: {}", token_input.chain, e);
                continue;
            }
        };

        let token_id = match RegistryToken::generate_id(&chain, Some(&ledger_pid)) {
            Ok(id) => id,
            Err(e) => {
                ic_cdk::println!("Failed to generate token ID: {}", e);
                continue;
            }
        };

        // Check if token already exists in registry - if so, just add it to user's list
        if registry.get_token(&token_id).is_some() {
            token_ids_to_add.push(token_id);
            continue;
        }

        // For new tokens, we need metadata
        let (symbol, name, decimals) = if token_input.symbol.is_some()
            && token_input.name.is_some()
            && token_input.decimals.is_some()
        {
            ic_cdk::println!(
                "Using provided metadata for token {}: {:#?}",
                token_id,
                token_input
            );
            // Use provided metadata
            (
                token_input.symbol.unwrap(),
                token_input.name.unwrap(),
                token_input.decimals.unwrap(),
            )
        } else {
            // Create a service for querying token metadata
            let service = Service::new(ledger_pid.clone());

            ic_cdk::println!(
                "Fetching metadata for token {}: {:#?}",
                token_id,
                token_input
            );

            // Execute all metadata queries concurrently
            let symbol_future = service.icrc_1_symbol();
            let name_future = service.icrc_1_name();
            let decimals_future = service.icrc_1_decimals();

            // Await all futures at once to save time
            let symbol_result = symbol_future.await;
            let name_result = name_future.await;
            let decimals_result = decimals_future.await;

            // Check if any of the calls failed
            if let Err((code, msg)) = &symbol_result {
                ic_cdk::println!(
                    "Failed to get symbol for token {}: {:#?}, {:#?}",
                    ledger_pid,
                    code,
                    msg
                );
                continue;
            }
            if let Err((code, msg)) = &name_result {
                ic_cdk::println!(
                    "Failed to get name for token {}: {:#?}, {:#?}",
                    ledger_pid,
                    code,
                    msg
                );
                continue;
            }
            if let Err((code, msg)) = &decimals_result {
                ic_cdk::println!(
                    "Failed to get decimals for token {}: {:#?}, {:#?}",
                    ledger_pid,
                    code,
                    msg
                );
                continue;
            }

            // Extract values from results
            let (symbol,) = symbol_result.unwrap();
            let (name,) = name_result.unwrap();
            let (decimals,) = decimals_result.unwrap();

            (symbol, name, decimals)
        };

        // Create register token input and add to batch
        register_inputs.push(RegisterTokenInput {
            id: token_id.clone(),
            chain: token_input.chain,
            ledger_id: Some(ledger_pid),
            index_id: token_input.index_id,
            symbol,
            name,
            decimals,
            enabled_by_default: false,
        });

        token_ids_to_add.push(token_id);
    }

    // Register new tokens in bulk if any
    if !register_inputs.is_empty() {
        match registry.add_bulk_tokens(register_inputs) {
            Ok(_) => {}
            Err(e) => {
                ic_cdk::println!("Error registering tokens in bulk: {}", e);
                return Err(format!("Error registering tokens: {}", e));
            }
        }
    }

    let end_1_ts = ic_cdk::api::time();

    ic_cdk::println!(
        "Token registration took {} nanosecond",
        (end_1_ts - start_ts)
    );

    // Sync registry tokens once at the end
    let _ = repository.sync_registry_tokens(&caller.to_text());

    let end_2_ts = ic_cdk::api::time();

    ic_cdk::println!(
        "sync_registry_tokens took {} nanosecond",
        (end_2_ts - end_1_ts)
    );

    Ok(())
}

ic_cdk::export_candid!();
