use candid::Principal;
use cashier_backend_types::error::CanisterError;
use cashier_common::build_data::BuildData;
use ic_cdk::{api::msg_caller, query, update};
use log::debug;

use crate::{api::state::get_state, apps::auth::Permission, build_data::canister_build_data};

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

/// Clears all cached token fees
#[update]
pub fn admin_fee_cache_clear() -> Result<(), CanisterError> {
    debug!("[admin_fee_cache_clear]");
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.token_fee_service.clear_all();

    Ok(())
}

/// Clears cached fee for specific token
#[update]
pub fn admin_fee_cache_clear_token(token_id: Principal) -> Result<(), CanisterError> {
    debug!("[admin_fee_cache_clear_token] token_id={}", token_id);
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.token_fee_service.clear_token(&token_id.to_text());

    Ok(())
}
