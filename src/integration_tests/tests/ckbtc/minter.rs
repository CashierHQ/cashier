// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc;
use std::sync::OnceLock;
use token_storage_types::bitcoin::ckbtc_minter::{BtcNetwork, InitArgs, MinterArg, Mode};

use crate::utils::{deploy_canister_with_id, load_canister_bytecode, principal::TestUser};

/// Deploys a CKBTC minter canister with the given canister ID and KYT principal (if any).
/// # Arguments
/// * `client` - The Pocket IC client to use for deployment
/// * `canister_id` - The Principal ID for the new canister
/// * `kyt_principal` - Optional Principal ID for the KYT service
/// # Returns
/// * `Principal` - The Principal ID of the deployed CKBTC minter canister
pub async fn deploy_ckbtc_minter_canister(
    client: &PocketIc,
    canister_id: Principal,
    kyt_principal: Option<Principal>,
) -> Principal {
    let deployer_id = TestUser::TokenDeployer.get_principal();
    let init_args = InitArgs {
        btc_network: BtcNetwork::Regtest,
        ledger_id: canister_id,
        ecdsa_key_name: "dfx_test_key".to_string(),
        retrieve_btc_min_amount: 10_000,
        max_time_in_queue_nanos: 10_000_000_000,
        min_confirmations: Some(1),
        mode: Mode::GeneralAvailability,
        kyt_fee: Some(100),
        kyt_principal,
    };

    deploy_canister_with_id(
        client,
        Some(deployer_id),
        None,
        canister_id,
        get_ckbtc_minter_canister_bytecode(),
        &MinterArg::Init(init_args),
    )
    .await
}

/// Retrieves the bytecode for the CKBTC minter canister.
pub fn get_ckbtc_minter_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("ckbtc_minter.wasm.gz"))
        .to_owned()
}
