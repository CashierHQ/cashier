// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit},
};
use gate_service_types::error::GateServiceError;

/// Decrypts a blob produced by the admin script (`nonce || ciphertext+tag`).
/// The nonce is the first 12 bytes; the rest is AES-256-GCM ciphertext with auth tag.
/// # Arguments
/// * `data`: Encrypted blob: 12-byte nonce followed by AES-256-GCM ciphertext+auth-tag.
/// * `key`: 32-byte AES-256 key derived from vetKD.
/// # Returns
/// * `Ok(Vec<u8>)`: Decrypted plaintext bytes.
/// * `Err(GateServiceError::KeyVerificationFailed)`: Data too short, cipher init failed, or
///   authentication tag mismatch.
#[allow(deprecated)]
pub fn aes_decrypt(data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, GateServiceError> {
    if data.len() < 12 {
        return Err(GateServiceError::KeyVerificationFailed(
            "ciphertext too short".into(),
        ));
    }
    let (nonce_bytes, ciphertext) = data.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| GateServiceError::KeyVerificationFailed(format!("aes init: {e}")))?;
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| GateServiceError::KeyVerificationFailed(format!("aes decrypt: {e}")))
}
