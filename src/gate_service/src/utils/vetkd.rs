// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::vetkey::VetKeyRepository;
use gate_service_types::{
    constant::{VETKEY_CONTEXT, VETKEY_INPUT, VETKEY_NAME, VETKEY_SYMMETRIC_DOMAIN},
    error::GateServiceError,
};
use ic_cdk::management_canister::{VetKDCurve, VetKDDeriveKeyArgs, VetKDKeyId, VetKDPublicKeyArgs};
use ic_vetkeys::{DerivedPublicKey, EncryptedVetKey, TransportSecretKey};
use rand::Rng;

fn vetkey_id() -> VetKDKeyId {
    VetKDKeyId {
        curve: VetKDCurve::Bls12_381_G2,
        name: VETKEY_NAME.to_string(),
    }
}

/// Returns the canister's derived VetKD public key (G2 point, 96 bytes).
/// This is the public key for (this_canister, VETKEY_CONTEXT) — already fully derived by IC.
/// The admin script uses this as the `derived_public_key_bytes` for decryption.
/// # Returns
/// * `Ok(Vec<u8>)`: 96-byte BLS12-381 G2 derived public key.
/// * `Err(GateServiceError::KeyVerificationFailed)`: IC management canister call failed.
pub async fn fetch_derived_public_key() -> Result<Vec<u8>, GateServiceError> {
    ic_cdk::management_canister::vetkd_public_key(&VetKDPublicKeyArgs {
        canister_id: None,
        context: VETKEY_CONTEXT.to_vec(),
        key_id: vetkey_id(),
    })
    .await
    .map(|r| r.public_key)
    .map_err(|e| GateServiceError::KeyVerificationFailed(format!("vetkd_public_key: {e:?}")))
}

/// Calls vetkd_derive_key with the given transport public key and returns
/// the encrypted VetKey bytes. The caller decrypts using their transport secret key.
/// # Arguments
/// * `transport_public_key`: Caller's ephemeral transport public key used by the IC to
///   encrypt the returned VetKey so only the caller can decrypt it.
/// # Returns
/// * `Ok(Vec<u8>)`: Encrypted VetKey bytes.
/// * `Err(GateServiceError::KeyVerificationFailed)`: IC management canister call failed.
pub async fn derive_encrypted_vetkey(
    transport_public_key: Vec<u8>,
) -> Result<Vec<u8>, GateServiceError> {
    ic_cdk::management_canister::vetkd_derive_key(&VetKDDeriveKeyArgs {
        input: VETKEY_INPUT.to_vec(),
        context: VETKEY_CONTEXT.to_vec(),
        key_id: vetkey_id(),
        transport_public_key,
    })
    .await
    .map(|r| r.encrypted_key)
    .map_err(|e| GateServiceError::KeyVerificationFailed(format!("vetkd_derive_key: {e:?}")))
}

/// Fetches and derives a fresh 32-byte AES-256 key from the IC vetKD system.
/// Makes two management canister round-trips on every call.
async fn derive_aes_key_from_ic() -> Result<[u8; 32], GateServiceError> {
    // Ephemeral transport key — exists only for this call
    let seed: [u8; 32] = rand::thread_rng().r#gen();
    let tsk = TransportSecretKey::from_seed(seed.to_vec())
        .map_err(|e| GateServiceError::KeyVerificationFailed(format!("transport key: {e}")))?;

    // Fetch the already-fully-derived public key for (this_canister, VETKEY_CONTEXT)
    let dpk_bytes = fetch_derived_public_key().await?;
    let derived_pk = DerivedPublicKey::deserialize(&dpk_bytes).map_err(|e| {
        GateServiceError::KeyVerificationFailed(format!("invalid derived pk: {e:?}"))
    })?;

    // Derive the VetKey (BLS signature for VETKEY_INPUT under derived_pk)
    let ek_bytes = derive_encrypted_vetkey(tsk.public_key()).await?;
    let ek = EncryptedVetKey::deserialize(&ek_bytes)
        .map_err(|e| GateServiceError::KeyVerificationFailed(format!("invalid ek: {e}")))?;

    let vetkey = ek
        .decrypt_and_verify(&tsk, &derived_pk, VETKEY_INPUT)
        .map_err(|e| GateServiceError::KeyVerificationFailed(format!("vetkey decrypt: {e}")))?;

    // HKDF over the VetKey bytes → 32-byte AES-256 key
    let key_bytes = vetkey.derive_symmetric_key(VETKEY_SYMMETRIC_DOMAIN, 32);
    key_bytes
        .try_into()
        .map_err(|_| GateServiceError::KeyVerificationFailed("key length mismatch".into()))
}

/// Derives a 32-byte AES-256 key, using the heap cache when available.
///
/// On first call the key is derived via two IC management canister calls and stored in heap
/// memory for the lifetime of the canister instance (cleared on upgrade). Subsequent calls
/// return the cached value immediately with no inter-canister round-trips.
/// # Returns
/// * `Ok([u8; 32])`: 32-byte AES-256 key ready for use with `aes_decrypt`.
/// * `Err(GateServiceError::KeyVerificationFailed)`: Transport key generation, IC call,
///   VetKey decryption, or HKDF output failed (first call only; cached calls never fail).
pub async fn derive_aes_key() -> Result<[u8; 32], GateServiceError> {
    let repo = VetKeyRepository::new();
    if let Some(key) = repo.get_cached_key() {
        return Ok(key);
    }
    let key = derive_aes_key_from_ic().await?;
    repo.set_cached_key(key);
    Ok(key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn it_should_return_cached_key_without_ic_call() {
        // Arrange — seed cache to bypass any IC management call
        let expected = [42u8; 32];
        VetKeyRepository::new().set_cached_key(expected);

        // Act
        let result = derive_aes_key().await.unwrap();

        // Assert
        assert_eq!(result, expected);

        // Cleanup
        VetKeyRepository::new().clear_cached_key();
    }
}
