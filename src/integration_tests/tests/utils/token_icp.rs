use std::sync::OnceLock;

use super::PocketIcTestContext;
use crate::utils::{
    deploy_canister_with_id, load_canister_bytecode, principal::get_user_principal,
};
use candid::{CandidType, Deserialize, Principal};
use ic_ledger_types::{AccountIdentifier, Subaccount, DEFAULT_SUBACCOUNT};
use ic_mple_client::PocketIcClient;
use icrc_ledger_types::icrc1::account::Account;
use std::vec;

#[derive(CandidType, Deserialize, Debug)]
pub struct FeatureFlags {
    pub icrc2: bool,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct UpgradeArgs {
    #[serde(rename = "icrc1_minting_account")]
    pub icrc_1_minting_account: Option<Account>,
    pub feature_flags: Option<FeatureFlags>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct Tokens {
    #[serde(rename = "e8s")]
    pub e_8_s: u64,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct Duration {
    pub secs: u64,
    pub nanos: u32,
}

#[derive(CandidType, Deserialize, Debug)]
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
pub type TextAccountIdentifier = String;
#[derive(CandidType, Deserialize, Debug)]
pub struct InitArgs {
    pub send_whitelist: Vec<Principal>,
    pub token_symbol: Option<String>,
    pub transfer_fee: Option<Tokens>,
    pub minting_account: TextAccountIdentifier,
    pub transaction_window: Option<Duration>,
    pub max_message_size_bytes: Option<u64>,
    #[serde(rename = "icrc1_minting_account")]
    pub icrc_1_minting_account: Option<Account>,
    pub archive_options: Option<ArchiveOptions>,
    pub initial_values: Vec<(TextAccountIdentifier, Tokens)>,
    pub token_name: Option<String>,
    pub feature_flags: Option<FeatureFlags>,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum LedgerCanisterPayload {
    Init(InitArgs),
    Upgrade(Option<UpgradeArgs>),
}

/// Creates a new ICP ledger client for the given caller
pub fn new_icp_ledger_client(
    context: &PocketIcTestContext,
    icp_ledger_principal: Principal,
    caller: Principal,
) -> PocketIcClient {
    context.new_client(icp_ledger_principal, caller)
}

/// Deploys ICP ledger canister and returns the ICP ledger principal
pub async fn deploy_icp_ledger_canister(
    client: &ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc,
) -> Principal {
    let token_deployer_pid = get_user_principal("token_deployer");

    let icp_init_args = InitArgs {
        minting_account: AccountIdentifier::new(&token_deployer_pid, &DEFAULT_SUBACCOUNT)
            .to_string(),
        initial_values: vec![],
        send_whitelist: vec![],
        transfer_fee: Some(Tokens { e_8_s: 10000 }),
        token_symbol: Some("ICP".to_string()),
        token_name: Some("ICP".to_string()),
        feature_flags: Some(FeatureFlags { icrc2: true }),
        icrc_1_minting_account: None,
        transaction_window: None,
        archive_options: None,
        max_message_size_bytes: None,
    };

    let icp_canister_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

    let icp_ledger_principal = deploy_canister_with_id(
        client,
        Some(token_deployer_pid),
        None,
        icp_canister_id,
        get_icp_ledger_canister_bytecode(),
        &(LedgerCanisterPayload::Init(icp_init_args)),
    )
    .await;

    icp_ledger_principal
}

/// Retrieves the bytecode for the ICP ledger canister.
///
/// This function uses a `OnceLock` to ensure that the bytecode is loaded only once.
/// The bytecode is loaded from the "ledger-suite-icp.wasm.gz" file located in the target artifacts directory.
///
/// Returns a `Vec<u8>` containing the bytecode of the ICP ledger canister.
pub fn get_icp_ledger_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("ledger-suite-icp.wasm.gz"))
        .to_owned()
}
