// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;

#[derive(CandidType, Debug, PartialEq, Clone)]
#[storable]
/// Controls whether API secrets are stored and retrieved as vetKey-encrypted blobs
/// or as plain-text strings.
pub enum SecretStorageMode {
    /// Secrets are AES-256-GCM encrypted using a vetKD-derived key (secure, slower).
    VetKey,
    /// Secrets are stored as raw UTF-8 strings (fast, for dev/testing).
    PlainText,
}

#[derive(CandidType, Debug, PartialEq, Clone, Default)]
#[storable]
/// Controls which hashing algorithm the password gate uses on the backend.
pub enum PasswordHashingAlgorithm {
    /// Argon2id v19 with default parameters (~1B cycles per operation). Secure, memory-hard.
    #[default]
    Argon2id,
    /// SHA-256 with a random salt (much cheaper in WASM instruction count).
    Sha256,
}
