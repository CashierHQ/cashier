// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::utils::load_canister_bytecode;
use std::sync::OnceLock;

/// Retrieves the bytecode for the ICRC7 NFT canister.
///
/// This function uses a `OnceLock` to ensure that the bytecode is loaded only once.
/// The bytecode is loaded from the "icrc7_nft_canister.wasm.gz" file located in the target artifacts directory.
///
/// Returns a `Vec<u8>` containing the bytecode of the ICRC7 NFT canister.
pub fn get_icrc7_nft_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("icrc7_nft_canister.wasm.gz"))
        .to_owned()
}
