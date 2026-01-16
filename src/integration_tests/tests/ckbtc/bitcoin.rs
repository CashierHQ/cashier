// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_btc_interface::{Config, Network};
use ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc;
use std::sync::OnceLock;

use crate::utils::{deploy_canister_with_id, load_canister_bytecode, principal::TestUser};

pub async fn deploy_bitcoin_canister(client: &PocketIc) -> Principal {
    let nns_root_canister_id: Principal =
        Principal::from_text("r7inp-6aaaa-aaaaa-aaabq-cai").unwrap();
    let canister_id = Principal::from_text("g4xu7-jiaaa-aaaan-aaaaq-cai").unwrap();

    let init_args = Config {
        network: Network::Regtest,
        ..Default::default()
    };

    deploy_canister_with_id(
        client,
        Some(nns_root_canister_id),
        None,
        canister_id,
        get_bitcoin_canister_bytecode(),
        &init_args,
    )
    .await
}

/// Retrieves the bytecode for the CKBTC KYT canister.
pub fn get_bitcoin_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("ic_btc_canister.wasm.gz"))
        .to_owned()
}
