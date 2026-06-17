use crate::{
    repositories::{PLAIN_SECRETS_STORE, SECRET_STORAGE_MODE, SECRETS_STORE},
    utils::{crypto::aes_decrypt, vetkd::derive_aes_key},
};
use gate_service_types::{SecretStorageMode, error::GateServiceError};

/// Reads the raw encrypted ciphertext for a secret by name.
pub fn get_secret_ciphertext(key: &str) -> Option<Vec<u8>> {
    SECRETS_STORE.with_borrow(|m| m.get(&key.to_string()))
}

/// Retrieves a named secret, using the active storage mode to decide how to read it.
///
/// - `PlainText`: reads directly from the plain-text store (no async canister calls).
/// - `VetKey`: decrypts via a freshly derived vetKD AES key (requires two management
///   canister calls: `vetkd_public_key` + `vetkd_derive_key`).
pub async fn get_decrypted_secret(key: &str) -> Result<String, GateServiceError> {
    let mode = SECRET_STORAGE_MODE.with_borrow(|m| m.get().clone());

    match mode {
        SecretStorageMode::PlainText => PLAIN_SECRETS_STORE
            .with_borrow(|m| m.get(&key.to_string()))
            .ok_or_else(|| {
                GateServiceError::KeyVerificationFailed(format!(
                    "{key} not configured in plain-text store"
                ))
            }),
        SecretStorageMode::VetKey => {
            let ciphertext = get_secret_ciphertext(key).ok_or_else(|| {
                GateServiceError::KeyVerificationFailed(format!("{key} not configured"))
            })?;

            let aes_key = derive_aes_key().await?;
            let plaintext = aes_decrypt(&ciphertext, &aes_key)?;

            String::from_utf8(plaintext)
                .map_err(|e| GateServiceError::KeyVerificationFailed(format!("utf8: {e}")))
        }
    }
}
