use candid::Principal;
use cashier_backend_types::error::CanisterError;
use cashier_common::build_data::BuildData;
use ic_cdk::{api::msg_caller, query, update};
use log::debug;

use cashier_backend_types::backoff::BackoffConfig;
use cashier_backend_types::rate_limit::RateLimitConfig;

use cashier_backend_types::settings::{SettingsDto, UpdateSettingArgs};

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

/// Updates canister settings. Every field in `arg` is optional; only provided (`Some`) fields are
/// applied, the rest are left unchanged. Canister-id changes are persisted in stable memory
/// (survive upgrades) and propagated to live services — use to wire a freshly (re)created
/// token_storage / gate_service canister without reinstalling the backend.
///
/// # Authorization
/// Requires `Permission::Admin` (enforced in-method and at ingress via the `admin_` prefix guard).
#[update]
#[allow(clippy::needless_pass_by_value)]
pub fn admin_update_setting(arg: UpdateSettingArgs) -> Result<(), CanisterError> {
    debug!("[admin_update_setting] arg={arg:?}");
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    if let Some(inspect_message_enabled) = arg.inspect_message_enabled {
        state
            .settings
            .set_inspect_message_enabled(inspect_message_enabled);
    }
    if let Some(canister_id) = arg.token_storage_canister_id {
        state.set_token_storage_canister_id(canister_id);
    }
    if let Some(canister_id) = arg.gate_service_canister_id {
        state.set_gate_service_canister_id(canister_id);
    }
    Ok(())
}

/// Returns the current canister settings (for verification).
///
/// # Authorization
/// Requires `Permission::Admin`.
#[query]
pub fn admin_get_setting() -> SettingsDto {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    let settings = state.settings.get();
    SettingsDto {
        inspect_message_enabled: settings.inspect_message_enabled,
        token_storage_canister_id: settings.token_storage_canister_id,
        gate_service_canister_id: settings.gate_service_canister_id,
    }
}

/// Enables/disables the inspect message.
///
/// Deprecated: prefer `admin_update_setting` with `inspect_message_enabled = opt bool`.
/// Kept for backward compatibility with existing callers.
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

/// Clears all cached token fees from the service.
///
/// This admin endpoint invalidates all cached token transfer fees, forcing
/// subsequent fee queries to fetch fresh data from their respective token canisters.
/// Useful for cache invalidation when fee structures change or for testing purposes.
///
/// # Authorization
///
/// Requires `Permission::Admin`. The caller must have admin permissions or the call will panic.
///
/// # Returns
///
/// Returns `Ok(())` on successful cache clearance.
///
/// # Errors
///
/// Currently always returns `Ok(())` after clearing the cache.
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

/// Clears the cached fee for a specific token.
///
/// This admin endpoint invalidates the cached transfer fee for a single token,
/// forcing the next fee query for that token to fetch fresh data from its canister.
/// Useful when a specific token's fee structure changes without affecting other tokens.
///
/// # Arguments
///
/// * `token_id` - The `Principal` of the token canister whose cached fee should be cleared
///
/// # Authorization
///
/// Requires `Permission::Admin`. The caller must have admin permissions or the call will panic.
///
/// # Returns
///
/// Returns `Ok(())` on successful cache clearance for the specified token.
///
/// # Errors
///
/// Currently always returns `Ok(())` after clearing the token's cached fee.
#[update]
pub fn admin_fee_cache_clear_token(token_id: Principal) -> Result<(), CanisterError> {
    debug!("[admin_fee_cache_clear_token] token_id={}", token_id);
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.token_fee_service.clear_token(&token_id);

    Ok(())
}

/// Flushes the token standard cache.
/// This admin endpoint clears all cached token standard information, forcing subsequent queries
/// to fetch fresh data from the token storage canister.
#[update]
pub async fn admin_flush_token_standard_cache() -> Result<(), CanisterError> {
    debug!("[admin_flush_token_standard_cache]");
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.token_standard_service.flush_cache();

    Ok(())
}

/// Updates the gate API rate limit configuration.
///
/// Changes take effect immediately on the next `user_open_link_gate` call.
/// Set `enabled: false` to disable rate limiting entirely (e.g. for emergency access).
///
/// # Authorization
///
/// Requires `Permission::Admin`.
#[update]
pub fn admin_gate_rate_limit_update(config: RateLimitConfig) -> Result<(), CanisterError> {
    debug!("[admin_gate_rate_limit_update] config: {config:?}");
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.rate_limit_service.update_config(config);

    Ok(())
}

/// Returns the current gate API rate limit configuration.
///
/// # Authorization
///
/// Requires `Permission::Admin`.
#[query]
pub fn admin_gate_rate_limit_get() -> RateLimitConfig {
    debug!("[admin_gate_rate_limit_get]");
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.rate_limit_service.get_config()
}

/// Clears the rate limit state for a specific user, allowing them to make requests immediately.
///
/// # Authorization
///
/// Requires `Permission::Admin`.
#[update]
pub fn admin_gate_rate_limit_reset_user(user: Principal) -> Result<(), CanisterError> {
    debug!("[admin_gate_rate_limit_reset_user] user: {user}");
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.rate_limit_service.reset_user(&user);

    Ok(())
}

/// Updates the gate API exponential backoff configuration.
///
/// Changes take effect immediately on the next `user_open_link_gate` call.
/// Set `enabled: false` to disable backoff entirely (e.g. for emergency access).
///
/// # Authorization
///
/// Requires `Permission::Admin`.
#[update]
pub fn admin_gate_backoff_update(config: BackoffConfig) -> Result<(), CanisterError> {
    debug!("[admin_gate_backoff_update] config: {config:?}");
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.backoff_service.update_config(config);

    Ok(())
}

/// Returns the current gate API exponential backoff configuration.
///
/// # Authorization
///
/// Requires `Permission::Admin`.
#[query]
pub fn admin_gate_backoff_get() -> BackoffConfig {
    debug!("[admin_gate_backoff_get]");
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.backoff_service.get_config()
}

/// Clears the backoff state for a specific user, allowing them to retry immediately.
///
/// # Authorization
///
/// Requires `Permission::Admin`.
#[update]
pub fn admin_gate_backoff_reset_user(user: Principal) -> Result<(), CanisterError> {
    debug!("[admin_gate_backoff_reset_user] user: {user}");
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state.backoff_service.reset_user(&user);

    Ok(())
}
