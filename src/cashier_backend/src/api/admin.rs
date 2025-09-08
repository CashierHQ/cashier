use candid::Principal;
use cashier_backend_types::error::CanisterError;
use cashier_common::build_data::BuildData;
use ic_cdk::{api::msg_caller, query, update};
use log::debug;

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

    /// Disable/enable the inspect message.
    ///
    /// If `inspect_message` is disabled, `send_raw_transaction` method will not attempt to early
    /// reject the incomming update calls and will proceed to the canister consensus round. Invalid
    /// transactions will still be rejected, but returned result will have expected `did` type
    /// instead of IC rejection message. This makes it easy to work with the canister API but
    /// increases overhead in case of many invalid transactions.
    #[update]
    pub fn admin_inspect_message_enable(value: bool) -> Result<(), CanisterError> {
        let mut state = get_state();
        let caller = msg_caller();
        state
            .auth_service
            .must_have_permission(&caller, Permission::Admin);

        
        EVM_STATE.with(|evm_state| {
            evm_state.permissions.borrow().check_admin(&ic::caller())?;
            evm_state
                .evm_state
                .borrow_mut()
                .disable_inspect_message(value);
            Ok(())
        })
    }