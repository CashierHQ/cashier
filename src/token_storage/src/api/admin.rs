// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_common::build_data::BuildData;
use ic_cdk::{api::msg_caller, query, update};
use log::{debug, info};
use token_storage_types::{
    error::CanisterError,
    token::{RegistryStats, TokenDto, TokenRegistryMetadata},
};

use crate::{api::state::get_state, build_data::canister_build_data, services::auth::Permission};

/// Returns the build data of the canister.
#[query]
fn get_canister_build_data() -> BuildData {
    debug!("[get_canister_build_data]");
    canister_build_data()
}

/// Adds permissions to a principal and returns the principal permissions.
#[update]
pub fn admin_permissions_add(
    principal: Principal,
    permissions: Vec<Permission>,
) -> Result<Vec<Permission>, CanisterError> {
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state
        .auth_service
        .add_permissions(principal, permissions)
        .map(|p| p.permissions.into_iter().collect())
        .map_err(|e| CanisterError::AuthError(format!("{e:?}")))
}

/// Returns the permissions of a principal.
#[query]
pub fn admin_permissions_get(principal: Principal) -> Vec<Permission> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state
        .auth_service
        .get_permissions(&principal)
        .permissions
        .into_iter()
        .collect()
}

/// Removes permissions from a principal and returns the principal permissions.
#[update]
#[allow(clippy::needless_pass_by_value)]
pub fn admin_permissions_remove(
    principal: Principal,
    permissions: Vec<Permission>,
) -> Result<Vec<Permission>, CanisterError> {
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state
        .auth_service
        .remove_permissions(principal, &permissions)
        .map(|p| p.permissions.into_iter().collect())
        .map_err(|e| CanisterError::AuthError(format!("{e:?}")))
}

/// Gets the full metadata of the token registry
/// Includes version number and last updated timestamp
#[query]
pub fn admin_get_registry_metadata() -> TokenRegistryMetadata {
    debug!("[admin_get_registry_metadata]");
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    let service = state.token_registry;
    service.get_metadata()
}

#[query]
pub fn admin_get_registry_tokens(only_enable: bool) -> Vec<TokenDto> {
    debug!("[admin_get_registry_tokens] only_enable: {only_enable}");
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    let service = state.token_registry;
    let list: Vec<TokenDto> = service
        .registry_repository
        .list_tokens()
        .iter()
        .map(|token| TokenDto::from(token.clone()))
        .collect();

    if only_enable {
        list.into_iter().filter(|token| token.enabled).collect()
    } else {
        list
    }
}

#[update]
pub fn admin_initialize_registry() -> Result<(), String> {
    info!("[admin_initialize_registry]");
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    let mut registry = state.token_registry;
    registry
        .delete_all()
        .expect("Should be able to delete registry");

    Ok(())
}

#[query]
pub fn admin_get_stats() -> Result<RegistryStats, String> {
    debug!("[admin_get_stats]");

    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    let token_registry = state.token_registry;
    let list_tokens = token_registry.registry_repository.list_tokens();
    let total_tokens = list_tokens.len();
    let total_enabled_default = list_tokens.iter().filter(|t| t.enabled_by_default).count();

    Ok(RegistryStats {
        total_tokens,
        total_enabled_default,
    })
}

/// Enables/disables the inspect message.
#[update]
pub fn admin_inspect_message_enable(inspect_message_enabled: bool) -> Result<(), CanisterError> {
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state
        .settings
        .set_inspect_message_enabled(inspect_message_enabled);
    Ok(())
}

/// Returns the inspect message status.
#[query]
pub fn is_inspect_message_enabled() -> bool {
    let state = get_state();
    state.settings.is_inspect_message_enabled()
}
