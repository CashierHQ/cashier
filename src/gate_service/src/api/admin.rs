// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use crate::repositories::{
    PLAIN_SECRETS_STORE, Repositories, SECRET_STORAGE_MODE, SECRETS_STORE, ThreadlocalRepositories,
};
use crate::utils::vetkd::{derive_encrypted_vetkey, fetch_derived_public_key};
use candid::Principal;
use gate_service_types::{
    PasswordHashingAlgorithm, SecretStorageMode, auth::Permission, error::GateServiceError,
};
use ic_cdk::{api::msg_caller, query, update};

/// Adds permissions to a principal and returns the updated permission list.
/// # Arguments
/// * `principal`: The IC principal to grant permissions to.
/// * `permissions`: The set of permissions to add.
/// # Returns
/// * `Ok(Vec<Permission>)`: The full updated permission list for the principal.
/// * `Err(GateServiceError::AuthError)`: Caller is not an admin, or the operation failed.
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
/// # Arguments
/// * `principal`: The IC principal to look up.
/// # Returns
/// The permission list currently held by that principal (empty if none).
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

/// Removes permissions from a principal and returns the updated permission list.
/// # Arguments
/// * `principal`: The IC principal to revoke permissions from.
/// * `permissions`: The set of permissions to remove.
/// # Returns
/// * `Ok(Vec<Permission>)`: The remaining permission list for the principal.
/// * `Err(GateServiceError::AuthError)`: Caller is not an admin, or the operation failed.
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
/// # Returns
/// * `Ok(Vec<u8>)`: 96-byte BLS12-381 G2 derived public key.
/// * `Err(GateServiceError)`: Caller is not an admin, or the IC management call failed.
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
/// # Arguments
/// * `transport_public_key`: The caller's ephemeral transport public key (32 bytes).
/// # Returns
/// * `Ok(Vec<u8>)`: Encrypted VetKey bytes for the caller to decrypt locally.
/// * `Err(GateServiceError)`: Caller is not an admin, or the IC management call failed.
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
/// # Arguments
/// * `key`: Logical name for the secret (e.g. `"twitter_api_key"`).
/// * `ciphertext`: 12-byte nonce followed by AES-256-GCM ciphertext+tag.
/// # Returns
/// * `Ok(())`: Secret stored successfully.
/// * `Err(GateServiceError::AuthError)`: Caller is not an admin.
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
/// # Arguments
/// * `key`: Logical name of the secret to remove.
/// # Returns
/// * `Ok(())`: Secret removed (or was already absent).
/// * `Err(GateServiceError::AuthError)`: Caller is not an admin.
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
/// # Returns
/// The active `SecretStorageMode` (`PlainText` or `VetKey`).
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
/// # Arguments
/// * `mode`: The new storage mode (`PlainText` for testing, `VetKey` for production).
/// # Returns
/// * `Ok(())`: Mode updated successfully.
/// * `Err(GateServiceError::AuthError)`: Caller is not an admin.
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
/// # Arguments
/// * `key`: Logical name for the secret (e.g. `"twitter_api_key"`).
/// * `value`: Plaintext secret value.
/// # Returns
/// * `Ok(())`: Secret stored successfully.
/// * `Err(GateServiceError::AuthError)`: Caller is not an admin.
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
/// # Returns
/// The active `PasswordHashingAlgorithm` (`Argon2` or `Sha256`).
#[query]
pub fn admin_get_password_hashing_algorithm() -> PasswordHashingAlgorithm {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    ThreadlocalRepositories.password_hashing_algorithm().get()
}

/// Switches the password hashing algorithm used for all future password gate creations.
/// Existing gates are unaffected; the stored hash format encodes the algorithm used at
/// creation time, so verification always uses the correct path.
/// # Arguments
/// * `mode`: The new hashing algorithm (`Argon2` for security, `Sha256` for speed on IC).
/// # Returns
/// * `Ok(())`: Algorithm updated successfully.
/// * `Err(GateServiceError::AuthError)`: Caller is not an admin.
#[update]
pub fn admin_set_password_hashing_algorithm(
    mode: PasswordHashingAlgorithm,
) -> Result<(), GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::Admin);

    ThreadlocalRepositories
        .password_hashing_algorithm()
        .set(mode);
    Ok(())
}

/// Removes a named secret from the plain-text store.
/// # Arguments
/// * `key`: Logical name of the secret to remove.
/// # Returns
/// * `Ok(())`: Secret removed (or was already absent).
/// * `Err(GateServiceError::AuthError)`: Caller is not an admin.
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
