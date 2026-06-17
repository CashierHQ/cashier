use gate_service_types::error::GateServiceError;
use ic_cdk::management_canister::{VetKDCurve, VetKDDeriveKeyArgs, VetKDKeyId, VetKDPublicKeyArgs};
use ic_vetkeys::{DerivedPublicKey, EncryptedVetKey, TransportSecretKey};
use rand::Rng;

/// Key name used for vetKD derivation.
/// "key_1" is available on all IC networks (local dfx uses "dfx_test_key" for local testing only).
const VETKEY_NAME: &str = "key_1";

/// Derivation context — must match what the admin script passes to vetkd_public_key.
const VETKEY_CONTEXT: &[u8] = b"cashier-gate-secrets";

/// Derivation input — the identity used for all API secret keys.
pub const VETKEY_INPUT: &[u8] = b"cashier-gate-secrets";

/// HKDF domain separator used by VetKey::derive_symmetric_key.
pub const VETKEY_SYMMETRIC_DOMAIN: &str = "cashier-api-secrets-v1";

fn vetkey_id() -> VetKDKeyId {
    VetKDKeyId {
        curve: VetKDCurve::Bls12_381_G2,
        name: VETKEY_NAME.to_string(),
    }
}

/// Returns the canister's derived VetKD public key (G2 point, 96 bytes).
/// This is the public key for (this_canister, VETKEY_CONTEXT) — already fully derived by IC.
/// The admin script uses this as the `derived_public_key_bytes` for decryption.
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

/// Derives a 32-byte AES key from the vetKD system.
///
/// Generates an ephemeral transport keypair, calls vetkd_derive_key,
/// decrypts the result, and uses HKDF to produce the AES key.
/// Both the transport key and the raw VetKey bytes are dropped after derivation.
pub async fn derive_aes_key() -> Result<[u8; 32], GateServiceError> {
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
