// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use crate::repositories::{
    PASSWORD_HASHING_ALGORITHM, PLAIN_SECRETS_STORE, SECRET_STORAGE_MODE, SECRETS_STORE,
};
use crate::utils::vetkd::{derive_encrypted_vetkey, fetch_derived_public_key};
use candid::Principal;
use gate_service_types::{
    PasswordHashingAlgorithm, SecretStorageMode, auth::Permission, error::GateServiceError,
};
use ic_cdk::{api::msg_caller, query, update};

/// Adds permissions to a principal and returns the principal permissions.
#[update]
pub fn admin_permissions_add(
    principal: Principal,
    permissions: Vec<Permission>,
) -> Result<Vec<Permission>, GateServiceError> {
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state
        .auth_service
        .add_permissions(principal, permissions)
        .map(|p| p.permissions.into_iter().collect())
        .map_err(|e| GateServiceError::AuthError(format!("{e:?}")))
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
) -> Result<Vec<Permission>, GateServiceError> {
    let mut state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    state
        .auth_service
        .remove_permissions(principal, &permissions)
        .map(|p| p.permissions.into_iter().collect())
        .map_err(|e| GateServiceError::AuthError(format!("{e:?}")))
}

/// Returns the canister's vetKD derived public key (96-byte G2 point).
/// The admin script uses this to verify encrypted VetKeys and derive the AES key.
#[update]
pub async fn admin_vetkd_public_key() -> Result<Vec<u8>, GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    fetch_derived_public_key().await
}

/// Derives a VetKey for the provided transport public key and returns the
/// encrypted key bytes. The admin script decrypts this with its transport
/// secret key to obtain the 32-byte AES key used to encrypt secrets.
#[update]
pub async fn admin_derive_vetkey(
    transport_public_key: Vec<u8>,
) -> Result<Vec<u8>, GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    derive_encrypted_vetkey(transport_public_key).await
}

/// Stores an AES-256-GCM encrypted secret (`nonce || ciphertext`) in stable memory.
/// The ciphertext must be produced by the admin script using the AES key derived
/// from `admin_derive_vetkey`. Known keys: "twitter_api_key", "x_oauth_basic_auth",
/// "x_redirect_uri".
#[update]
pub fn admin_secret_set(key: String, ciphertext: Vec<u8>) -> Result<(), GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    SECRETS_STORE.with_borrow_mut(|m| {
        m.insert(key, ciphertext);
    });
    Ok(())
}

/// Removes a named secret from stable memory.
#[update]
pub fn admin_secret_delete(key: String) -> Result<(), GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    SECRETS_STORE.with_borrow_mut(|m| {
        m.remove(&key);
    });
    Ok(())
}

/// Returns the current secret storage mode.
#[query]
pub fn admin_get_secret_storage_mode() -> SecretStorageMode {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    SECRET_STORAGE_MODE.with_borrow(|m| m.get().clone())
}

/// Switches the secret storage mode used for all future gate verifications.
#[update]
pub fn admin_set_secret_storage_mode(mode: SecretStorageMode) -> Result<(), GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    SECRET_STORAGE_MODE.with_borrow_mut(|m| {
        m.set(mode);
    });
    Ok(())
}

/// Stores a plain-text secret in the plain-text store.
/// Used when the canister is operating in PlainText storage mode.
/// Known keys: "twitter_api_key", "x_oauth_basic_auth", "x_redirect_uri".
#[update]
pub fn admin_plain_secret_set(key: String, value: String) -> Result<(), GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    PLAIN_SECRETS_STORE.with_borrow_mut(|m| {
        m.insert(key, value);
    });
    Ok(())
}

/// Returns the current password hashing algorithm used when creating password gates.
#[query]
pub fn admin_get_password_hashing_algorithm() -> PasswordHashingAlgorithm {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    PASSWORD_HASHING_ALGORITHM.with_borrow(|m| m.get().clone())
}

/// Switches the password hashing algorithm used for all future password gate creations.
/// Existing gates are unaffected; the stored hash format encodes the algorithm used at
/// creation time, so verification always uses the correct path.
#[update]
pub fn admin_set_password_hashing_algorithm(
    mode: PasswordHashingAlgorithm,
) -> Result<(), GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    PASSWORD_HASHING_ALGORITHM.with_borrow_mut(|m| {
        m.set(mode);
    });
    Ok(())
}

/// Removes a named secret from the plain-text store.
#[update]
pub fn admin_plain_secret_delete(key: String) -> Result<(), GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    PLAIN_SECRETS_STORE.with_borrow_mut(|m| {
        m.remove(&key);
    });
    Ok(())
}
