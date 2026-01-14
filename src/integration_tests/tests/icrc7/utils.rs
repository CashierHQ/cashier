// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc;
use std::sync::OnceLock;
use token_storage_types::icrc7::{
    BuildVersion, CanisterLifecycleArgs, InitApprovalsArg, InitArgs, Permission, PermissionManager,
};

use crate::utils::{deploy_canister_with_id, load_canister_bytecode, principal::TestUser};

/// Deploys an ICRC7 NFT canister with the specified parameters.
/// # Arguments
/// * `client` - The Pocket IC client to use for deployment
/// * `collection_name` - The name of the NFT collection
/// * `collection_symbol` - The symbol of the NFT collection
/// * `collection_description` - The description of the NFT collection
/// * `canister_id` - The Principal ID for the new canister
/// # Returns
/// * `Principal` - The Principal ID of the deployed ICRC7 NFT canister
pub async fn deploy_icrc7_ledger_canister(
    client: &PocketIc,
    collection_name: &str,
    collection_symbol: &str,
    collection_description: &str,
    canister_id: Principal,
) -> Principal {
    let deployer_id = TestUser::TokenDeployer.get_principal();
    let permission_manager = PermissionManager {
        user_permissions: vec![(
            deployer_id,
            vec![
                Permission::UpdateMetadata,
                Permission::Minting,
                Permission::UpdateCollectionMetadata,
                Permission::UpdateUploads,
                Permission::ManageAuthorities,
                Permission::ReadUploads,
            ],
        )],
    };
    let approval_init = InitApprovalsArg {
        max_approvals_per_token_or_collection: None,
        max_revoke_approvals: None,
    };

    let init_args = InitArgs {
        permissions: permission_manager,
        supply_cap: None,
        tx_window: None,
        test_mode: false,
        default_take_value: None,
        max_canister_storage_threshold: None,
        logo: None,
        permitted_drift: None,
        name: collection_name.to_string(),
        description: Some(collection_description.to_string()),
        version: BuildVersion {
            major: 0,
            minor: 1,
            patch: 0,
        },
        max_take_value: None,
        max_update_batch_size: None,
        max_query_batch_size: None,
        commit_hash: "test-commit-hash".to_string(),
        max_memo_size: None,
        atomic_batch_transfers: None,
        collection_metadata: vec![],
        symbol: collection_symbol.to_string(),
        approval_init,
    };

    deploy_canister_with_id(
        client,
        Some(deployer_id),
        None,
        canister_id,
        get_icrc7_nft_canister_bytecode(),
        &CanisterLifecycleArgs::Init(init_args),
    )
    .await
}

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
