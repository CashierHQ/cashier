// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc;
use std::sync::OnceLock;
use token_storage_types::bitcoin::ckbtc_ledger::{
    Account, FeatureFlags, InitArgs, InitArgsArchiveOptions, LedgerArg,
};

use crate::utils::{deploy_canister_with_id, load_canister_bytecode, principal::TestUser};

pub async fn deploy_ckbtc_ledger_canister(
    client: &PocketIc,
    canister_id: Principal,
    minter_id: Principal,
) -> Principal {
    let deployer_id = TestUser::TokenDeployer.get_principal();
    let init_args = InitArgs {
        token_symbol: "ckBTC".to_string(),
        token_name: "Cashier Bitcoin".to_string(),
        decimals: Some(8),
        minting_account: Account {
            owner: minter_id,
            subaccount: None,
        },
        transfer_fee: Nat::from(10u64),
        metadata: vec![],
        max_memo_length: Some(80),
        initial_balances: vec![],
        archive_options: InitArgsArchiveOptions {
            num_blocks_to_archive: 100,
            trigger_threshold: 50,
            controller_id: deployer_id,
            max_transactions_per_response: None,
            more_controller_ids: None,
            max_message_size_bytes: None,
            cycles_for_archive_creation: None,
            node_max_memory_size_bytes: None,
        },
        maximum_number_of_accounts: None,
        accounts_overflow_trim_quantity: None,
        fee_collector_account: None,
        feature_flags: Some(FeatureFlags { icrc_2: true }),
    };

    deploy_canister_with_id(
        client,
        Some(deployer_id),
        None,
        canister_id,
        get_ckbtc_ledger_canister_bytecode(),
        &LedgerArg::Init(init_args),
    )
    .await
}

/// Retrieves the bytecode for the CKBTC ledger canister.
pub fn get_ckbtc_ledger_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("ckbtc_ledger.wasm.gz"))
        .to_owned()
}
