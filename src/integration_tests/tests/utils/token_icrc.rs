use std::{collections::HashMap, sync::OnceLock};

use candid::{CandidType, Nat, Principal};
use ic_mple_client::PocketIcClient;
use serde::Deserialize;

use crate::utils::{
    deploy_canister, deploy_canister_with_settings, load_canister_bytecode,
    principal::get_user_principal,
};

use super::PocketIcTestContext;

#[derive(CandidType, Deserialize)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<serde_bytes::ByteBuf>,
}

#[derive(CandidType, Deserialize)]
pub struct FeatureFlags {
    pub icrc2: bool,
}

#[derive(CandidType, Deserialize)]
pub struct ArchiveOptions {
    pub num_blocks_to_archive: u64,
    pub max_transactions_per_response: Option<u64>,
    pub trigger_threshold: u64,
    pub more_controller_ids: Option<Vec<Principal>>,
    pub max_message_size_bytes: Option<u64>,
    pub cycles_for_archive_creation: Option<u64>,
    pub node_max_memory_size_bytes: Option<u64>,
    pub controller_id: Principal,
}

#[derive(CandidType, Deserialize)]
pub enum MetadataValue {
    Int(candid::Int),
    Nat(candid::Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
}

#[derive(CandidType, Deserialize)]
pub struct InitArgs {
    pub decimals: Option<u8>,
    pub token_symbol: String,
    pub transfer_fee: candid::Nat,
    pub metadata: Vec<(String, MetadataValue)>,
    pub minting_account: Account,
    pub initial_balances: Vec<(Account, candid::Nat)>,
    pub fee_collector_account: Option<Account>,
    pub archive_options: ArchiveOptions,
    pub max_memo_length: Option<u16>,
    pub index_principal: Option<Principal>,
    pub token_name: String,
    pub feature_flags: Option<FeatureFlags>,
}

#[derive(CandidType, Deserialize)]
pub struct ChangeArchiveOptions {
    pub num_blocks_to_archive: Option<u64>,
    pub max_transactions_per_response: Option<u64>,
    pub trigger_threshold: Option<u64>,
    pub more_controller_ids: Option<Vec<Principal>>,
    pub max_message_size_bytes: Option<u64>,
    pub cycles_for_archive_creation: Option<u64>,
    pub node_max_memory_size_bytes: Option<u64>,
    pub controller_id: Option<Principal>,
}

#[derive(CandidType, Deserialize)]
pub enum ChangeFeeCollector {
    SetTo(Account),
    Unset,
}

#[derive(CandidType, Deserialize)]
pub struct UpgradeArgs {
    pub change_archive_options: Option<ChangeArchiveOptions>,
    pub token_symbol: Option<String>,
    pub transfer_fee: Option<candid::Nat>,
    pub metadata: Option<Vec<(String, MetadataValue)>>,
    pub change_fee_collector: Option<ChangeFeeCollector>,
    pub max_memo_length: Option<u16>,
    pub index_principal: Option<Principal>,
    pub token_name: Option<String>,
    pub feature_flags: Option<FeatureFlags>,
}

#[derive(CandidType, Deserialize)]
pub enum LedgerArgument {
    Upgrade(Option<UpgradeArgs>),
    Init(InitArgs),
}

/// Creates a new ICRC ledger client for the given token and caller
pub fn new_icrc_ledger_client(
    context: &PocketIcTestContext,
    token_principal: Principal,
    caller: Principal,
) -> PocketIcClient {
    context.new_client(token_principal, caller)
}

/// Creates ICRC ledger clients for all tokens with the given caller
pub fn new_all_icrc_ledger_clients(
    context: &PocketIcTestContext,
    icrc_token_map: &HashMap<String, Principal>,
    caller: Principal,
) -> HashMap<String, PocketIcClient> {
    icrc_token_map
        .iter()
        .map(|(token_name, principal)| (token_name.clone(), context.new_client(*principal, caller)))
        .collect()
}

/// Deploys ICRC ledger canisters and returns a HashMap of token names to principals
pub async fn deploy_icrc_ledger_canisters(
    client: &ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc,
) -> HashMap<String, Principal> {
    // Deploy ICRC ledgers (tokens 1-10)
    let mut icrc_token_map = HashMap::new();
    let token_deployer_pid = get_user_principal("token_deployer");
    for i in 1..=10 {
        let token_name = format!("token_{i}");
        let ledger_init_input = InitArgs {
            decimals: Some(8),
            token_symbol: token_name.clone(),
            transfer_fee: Nat::from(10000u64),
            metadata: vec![],
            minting_account: Account {
                owner: token_deployer_pid,
                subaccount: None,
            },
            initial_balances: vec![],
            fee_collector_account: None,
            archive_options: ArchiveOptions {
                num_blocks_to_archive: 1000,
                max_transactions_per_response: None,
                trigger_threshold: 1000,
                more_controller_ids: None,
                max_message_size_bytes: None,
                cycles_for_archive_creation: None,
                node_max_memory_size_bytes: None,
                controller_id: token_deployer_pid,
            },
            max_memo_length: None,
            index_principal: None,
            token_name: token_name.clone(),
            feature_flags: None,
        };
        let icrc_ledger_principal = deploy_canister_with_settings(
            client,
            Some(token_deployer_pid),
            None,
            get_icrc_ledger_canister_bytecode(),
            &LedgerArgument::Init(ledger_init_input),
        )
        .await;
        icrc_token_map.insert(token_name, icrc_ledger_principal);
    }

    icrc_token_map
}

/// Retrieves the bytecode for the ICRC ledger canister.
///
/// This function uses a `OnceLock` to ensure that the bytecode is loaded only once.
/// The bytecode is loaded from the "ledger-suite-icrc.wasm.gz" file located in the target artifacts directory.
///
/// Returns a `Vec<u8>` containing the bytecode of the ICRC ledger canister.
pub fn get_icrc_ledger_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("ledger-suite-icrc.wasm.gz"))
        .to_owned()
}
