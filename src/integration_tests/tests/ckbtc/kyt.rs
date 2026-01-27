// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc;
use std::sync::OnceLock;
use token_storage_types::bitcoin::ckbtc_kyt::{InitArg, LifecycleArg, Mode};

use crate::utils::{deploy_canister_with_id, load_canister_bytecode, principal::TestUser};

/// Deploys a CKBTC KYT canister with the given canister ID and minter principal.
/// # Arguments
/// * `client` - The Pocket IC client to use for deployment
/// * `canister_id` - The Principal ID for the new canister
/// * `minter_id` - The Principal ID for the CKBTC minter canister
/// # Returns
/// * `Principal` - The Principal ID of the deployed CKBTC KYT canister
pub async fn deploy_ckbtc_kyt_canister(
    client: &PocketIc,
    canister_id: Principal,
    minter_id: Principal,
) -> Principal {
    let deployer_id = TestUser::TokenDeployer.get_principal();
    let init_args = InitArg {
        maintainers: vec![deployer_id],
        mode: Mode::AcceptAll,
        minter_id,
    };
    deploy_canister_with_id(
        client,
        Some(deployer_id),
        None,
        canister_id,
        get_ckbtc_kyt_canister_bytecode(),
        &LifecycleArg::InitArg(init_args),
    )
    .await
}

/// Retrieves the bytecode for the CKBTC KYT canister.
pub fn get_ckbtc_kyt_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("ckbtc_kyt.wasm.gz"))
        .to_owned()
}
