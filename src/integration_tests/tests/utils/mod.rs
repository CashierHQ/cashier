use crate::{
    ckbtc,
    constant::{CK_BTC_PRINCIPAL, CK_ETH_PRINCIPAL, CK_USDC_PRINCIPAL, ICRC7_NFT_PRINCIPAL},
    constants,
    icrc7::{self, client::Icrc7Client},
    utils::{principal::TestUser, token_icp::IcpLedgerClient, token_icrc::IcrcLedgerClient},
};
use candid::{CandidType, Decode, Encode, Nat, Principal, utils::ArgumentEncoder};
use cashier_backend_client::client::CashierBackendClient;
use cashier_backend_types::init::CashierBackendInitData;
use gate_service_client::client::GateServiceBackendClient;
use gate_service_types::{self, init::GateServiceInitData};
use ic_cdk::management_canister::{CanisterId, CanisterSettings};
use ic_mple_client::PocketIcClient;
use ic_mple_log::service::LogServiceSettings;
use ic_mple_pocket_ic::{get_pocket_ic_client, pocket_ic::nonblocking::PocketIc};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    sync::{
        Arc, OnceLock,
        atomic::{AtomicU64, Ordering},
    },
    time::Duration,
};
use token_storage_client::client::TokenStorageClient;
use token_storage_types::{
    init::TokenStorageInitData,
    token::{ChainTokenDetails, RegistryToken},
};
use tokio::sync::OnceCell;

pub mod icrc_112;
pub mod link_id_to_account;
pub mod principal;
pub mod token_icp;
pub mod token_icrc;

/// Canister principals deployed in the shared template state.
/// Serialized to JSON for cross-process sharing (nextest compatibility).
#[derive(Clone, Serialize, Deserialize)]
struct SharedPrincipals {
    token_storage: Principal,
    cashier_backend: Principal,
    gate_service: Principal,
    icp_ledger: Principal,
    icrc_tokens: HashMap<String, Principal>,
    icrc7_ledger: Principal,
    ckbtc_minter: Principal,
    ckbtc_kyt: Principal,
}

/// Base path for PocketIC test state directories
const POCKET_IC_STATE_DIR: &str = "../../target/pocket-ic-test-state";
/// Fixed template dir name (shared across processes)
const TEMPLATE_DIR_NAME: &str = "template";
/// Marker file indicating template is fully built
const READY_MARKER: &str = "template.ready";
/// Lock file for cross-process synchronization
const LOCK_FILE_NAME: &str = "template.lock";
/// File storing serialized SharedPrincipals
const PRINCIPALS_FILE: &str = "principals.json";

/// Atomic counter for unique test dir names
static TEST_DIR_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Get or initialize the shared template state using file-based locking.
/// Works across processes (nextest compatible).
async fn get_shared_principals() -> (PathBuf, SharedPrincipals) {
    let base_dir = PathBuf::from(POCKET_IC_STATE_DIR);
    std::fs::create_dir_all(&base_dir).unwrap();

    let template_dir = base_dir.join(TEMPLATE_DIR_NAME);
    let ready_marker = base_dir.join(READY_MARKER);
    let lock_path = base_dir.join(LOCK_FILE_NAME);
    let principals_path = base_dir.join(PRINCIPALS_FILE);

    // Try to acquire exclusive lock via create_new (atomic mkdir-like)
    // Only one process succeeds; others poll until ready_marker appears.
    let is_initializer = File::create_new(&lock_path).is_ok();

    if is_initializer {
        // First process: deploy canisters and persist state
        let principals = deploy_template_state(&template_dir).await;
        let json = serde_json::to_string(&principals).unwrap();
        std::fs::write(&principals_path, &json).unwrap();
        // Mark template as ready after everything is written
        std::fs::write(&ready_marker, "ready").unwrap();
        (template_dir, principals)
    } else {
        // Wait for the initializer to finish (poll for ready marker)
        while !ready_marker.exists() {
            std::thread::sleep(Duration::from_millis(500));
        }
        let json = std::fs::read_to_string(&principals_path).unwrap();
        let principals: SharedPrincipals = serde_json::from_str(&json).unwrap();
        (template_dir, principals)
    }
}

/// Deploy all canisters once, persist state to template_dir on disk.
/// Called only by the first process that acquires the file lock.
async fn deploy_template_state(template_dir: &Path) -> SharedPrincipals {
    let log = LogServiceSettings {
        enable_console: Some(true),
        in_memory_records: None,
        max_record_length: None,
        log_filter: Some("debug".to_string()),
    };

    // Clean and create template dir
    if template_dir.exists() {
        std::fs::remove_dir_all(template_dir).unwrap();
    }
    std::fs::create_dir_all(template_dir).unwrap();

    // Build PocketIC with state_dir to persist canister state to disk
    let client = get_pocket_ic_client()
        .await
        .with_state_dir(template_dir.to_path_buf())
        .build_async()
        .await;

    let ckbtc_kyt_principal = ckbtc::kyt::deploy_ckbtc_kyt_canister(
        &client,
        Principal::from_text(constants::CKBTC_KYT_PRINCIPAL_ID).unwrap(),
        Principal::from_text(constants::CKBTC_MINTER_PRINCIPAL_ID).unwrap(),
    )
    .await;

    let ckbtc_minter_principal = ckbtc::minter::deploy_ckbtc_minter_canister(
        &client,
        Principal::from_text(constants::CKBTC_MINTER_PRINCIPAL_ID).unwrap(),
        Principal::from_text(constants::CKBTC_LEDGER_PRINCIPAL_ID).unwrap(),
        Some(ckbtc_kyt_principal),
    )
    .await;

    let token_storage_principal = deploy_canister(
        &client,
        None,
        get_token_storage_canister_bytecode(),
        &(TokenStorageInitData {
            log_settings: Some(log.clone()),
            owner: TestUser::TokenStorageAdmin.get_principal(),
            tokens: Some(vec![
                RegistryToken {
                    details: ChainTokenDetails::IC {
                        ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                        index_id: Some(
                            Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
                        ),
                        fee: Nat::from(10_000u64),
                    },
                    symbol: "ICP".to_string(),
                    name: "Internet Computer".to_string(),
                    decimals: 8,
                    enabled_by_default: true,
                },
                RegistryToken {
                    details: ChainTokenDetails::IC {
                        ledger_id: Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap(),
                        index_id: Some(
                            Principal::from_text("n5wcd-faaaa-aaaar-qaaea-cai").unwrap(),
                        ),
                        fee: Nat::from(10u64),
                    },
                    symbol: "ckBTC".to_string(),
                    name: "Chain Key Bitcoin".to_string(),
                    decimals: 8,
                    enabled_by_default: true,
                },
                RegistryToken {
                    details: ChainTokenDetails::IC {
                        ledger_id: Principal::from_text("ss2fx-dyaaa-aaaar-qacoq-cai").unwrap(),
                        index_id: Some(
                            Principal::from_text("s3zol-vqaaa-aaaar-qacpa-cai").unwrap(),
                        ),
                        fee: Nat::from(2_000_000_000_000u64),
                    },
                    symbol: "ckETH".to_string(),
                    name: "Chain Key Ethereum".to_string(),
                    decimals: 18,
                    enabled_by_default: true,
                },
                RegistryToken {
                    details: ChainTokenDetails::IC {
                        ledger_id: Principal::from_text("xevnm-gaaaa-aaaar-qafnq-cai").unwrap(),
                        index_id: Some(
                            Principal::from_text("xrs4b-hiaaa-aaaar-qafoa-cai").unwrap(),
                        ),
                        fee: Nat::from(10_000u64),
                    },
                    symbol: "ckUSDC".to_string(),
                    name: "Chain Key USD Coin".to_string(),
                    decimals: 8,
                    enabled_by_default: true,
                },
                RegistryToken {
                    details: ChainTokenDetails::IC {
                        ledger_id: Principal::from_text("x5qut-viaaa-aaaar-qajda-cai").unwrap(),
                        index_id: None,
                        fee: Nat::from(10_000u64),
                    },
                    symbol: "tICP".to_string(),
                    name: "Test Internet Computer".to_string(),
                    decimals: 8,
                    enabled_by_default: true,
                },
            ]),
            ckbtc_minter_id: ckbtc_minter_principal,
        }),
    )
    .await;

    let cashier_backend_principal = deploy_canister(
        &client,
        None,
        get_cashier_backend_canister_bytecode(),
        &(CashierBackendInitData {
            log_settings: Some(log.clone()),
            owner: TestUser::CashierBackendAdmin.get_principal(),
            token_fee_ttl_ns: Some(168 * 60 * 60 * 1_000_000_000),
        }),
    )
    .await;

    let gate_service_principal = deploy_canister(
        &client,
        None,
        get_gate_service_canister_bytecode(),
        &(GateServiceInitData {
            log_settings: Some(log),
            owner: TestUser::GateServiceAdmin.get_principal(),
            permissions: Some(HashMap::from([(
                cashier_backend_principal,
                vec![gate_service_types::auth::Permission::GateCreate],
            )])),
        }),
    )
    .await;

    let icp_ledger_principal = token_icp::deploy_icp_ledger_canister(&client).await;

    let mut icrc_token_map = HashMap::new();

    let ck_btc_principal = token_icrc::deploy_single_icrc_ledger_canister(
        &client,
        "Chain Key Bitcoin".to_string(),
        "ckBTC".to_string(),
        8,
        100,
        Some(Principal::from_text(CK_BTC_PRINCIPAL).unwrap()),
    )
    .await;

    let ck_eth_principal = token_icrc::deploy_single_icrc_ledger_canister(
        &client,
        "Chain Key Ethereum".to_string(),
        "ckETH".to_string(),
        18,
        2000000000000000000,
        Some(Principal::from_text(CK_ETH_PRINCIPAL).unwrap()),
    )
    .await;

    let ck_usdc_principal = token_icrc::deploy_single_icrc_ledger_canister(
        &client,
        "Chain Key USD Coin".to_string(),
        "ckUSDC".to_string(),
        8,
        10000,
        Some(Principal::from_text(CK_USDC_PRINCIPAL).unwrap()),
    )
    .await;

    let doge_principal = token_icrc::deploy_single_icrc_ledger_canister(
        &client,
        "Test Token".to_string(),
        "DOGE".to_string(),
        8,
        10000,
        None,
    )
    .await;

    icrc_token_map.insert("ckBTC".to_string(), ck_btc_principal);
    icrc_token_map.insert("ckETH".to_string(), ck_eth_principal);
    icrc_token_map.insert("ckUSDC".to_string(), ck_usdc_principal);
    icrc_token_map.insert("DOGE".to_string(), doge_principal);

    let icrc7_ledger_principal = icrc7::utils::deploy_icrc7_ledger_canister(
        &client,
        "TestCollection",
        "ICRC7TEST",
        "For testing",
        Principal::from_text(ICRC7_NFT_PRINCIPAL).unwrap(),
    )
    .await;

    // Drop PocketIC instance - state is persisted in template_dir
    client.drop().await;

    SharedPrincipals {
        token_storage: token_storage_principal,
        cashier_backend: cashier_backend_principal,
        gate_service: gate_service_principal,
        icp_ledger: icp_ledger_principal,
        icrc_tokens: icrc_token_map,
        icrc7_ledger: icrc7_ledger_principal,
        ckbtc_minter: ckbtc_minter_principal,
        ckbtc_kyt: ckbtc_kyt_principal,
    }
}

/// Recursively copy directory contents for test isolation
fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst_path)?;
        } else {
            std::fs::copy(entry.path(), &dst_path)?;
        }
    }
    Ok(())
}

/// Executes the provided asynchronous function within a `PocketIcTestContext` environment.
///
/// Uses shared state_dir for fast test execution. First call deploys all canisters
/// and persists state to disk (~30s). Subsequent calls copy the template state_dir
/// to a unique temp dir and mount it (~1s). Each test gets full isolation via
pub async fn with_pocket_ic_context<F, E>(f: F) -> Result<(), E>
where
    F: AsyncFnOnce(&PocketIcTestContext) -> Result<(), E>,
{
    let (template_dir, principals) = get_shared_principals().await;

    // Copy template state to unique temp dir for this test
    let test_id = TEST_DIR_COUNTER.fetch_add(1, Ordering::Relaxed);
    let test_dir =
        PathBuf::from(POCKET_IC_STATE_DIR).join(format!("test-{}-{}", std::process::id(), test_id));
    copy_dir_all(&template_dir, &test_dir).expect("Failed to copy template state dir");

    // Mount state from copied dir (skips canister deployment)
    let client = Arc::new(
        get_pocket_ic_client()
            .await
            .with_state_dir(test_dir.clone())
            .build_async()
            .await,
    );

    let result = f(&PocketIcTestContext {
        client: client.clone(),
        token_storage_principal: principals.token_storage,
        cashier_backend_principal: principals.cashier_backend,
        gate_service_principal: principals.gate_service,
        icp_ledger_principal: principals.icp_ledger,
        icrc_token_map: principals.icrc_tokens.clone(),
        icrc7_ledger_principal: principals.icrc7_ledger,
        ckbtc_minter_principal: principals.ckbtc_minter,
        ckbtc_kyt_principal: principals.ckbtc_kyt,
    })
    .await;

    if let Ok(client) = Arc::try_unwrap(client) {
        client.drop().await;
    }

    // Cleanup test state dir
    let _ = std::fs::remove_dir_all(&test_dir);

    result
}

/// A test context that provides access to a `PocketIc` client and a deployed canister.
#[derive(Clone)]
pub struct PocketIcTestContext {
    pub client: Arc<PocketIc>,
    pub token_storage_principal: Principal,
    pub cashier_backend_principal: Principal,
    pub gate_service_principal: Principal,
    pub icp_ledger_principal: Principal,
    pub icrc_token_map: HashMap<String, Principal>,
    pub icrc7_ledger_principal: Principal,
    pub ckbtc_minter_principal: Principal,
    pub ckbtc_kyt_principal: Principal,
}

impl PocketIcTestContext {
    /// Creates a new `PocketIcClient` from the `PocketIc` client of this context, bound to the given
    /// `canister` and `caller`.
    pub fn new_client(&self, canister: Principal, caller: Principal) -> PocketIcClient {
        PocketIcClient::from_client(self.client.clone(), canister, caller)
    }

    /// Creates a new `CashierBackendClient` from the `PocketIc` client of this context,
    /// bound to the `cashier_backend_principal` and the given `caller`.
    pub fn new_cashier_backend_client(
        &self,
        caller: Principal,
    ) -> CashierBackendClient<PocketIcClient> {
        CashierBackendClient::new(self.new_client(self.cashier_backend_principal, caller))
    }

    /// Creates a new `GateServiceBackendClient` from the `PocketIc` client of this context,
    /// bound to the `gate_service_principal` and the given `caller`.
    pub fn new_gate_service_client(
        &self,
        caller: Principal,
    ) -> GateServiceBackendClient<PocketIcClient> {
        GateServiceBackendClient::new(self.new_client(self.gate_service_principal, caller))
    }

    /// Creates a new `TokenStorageClient` from the `PocketIc` client of this context,
    /// bound to the `token_storage_principal` and the given `caller`.
    pub fn new_token_storage_client(
        &self,
        caller: Principal,
    ) -> TokenStorageClient<PocketIcClient> {
        TokenStorageClient::new(self.new_client(self.token_storage_principal, caller))
    }

    /// Creates a new ICP ledger client from the `PocketIc` client of this context,
    /// bound to the `icp_ledger_principal` and the given `caller`.
    pub fn new_icp_ledger_client(&self, caller: Principal) -> IcpLedgerClient<PocketIcClient> {
        IcpLedgerClient::new(self.new_client(self.icp_ledger_principal, caller))
    }

    /// Creates a new ICRC ledger client from the `PocketIc` client of this context,
    /// bound to the `icrc_token_map` and the given `caller` and `token_name`.
    pub fn new_icrc_ledger_client(
        &self,
        token_name: &str,
        caller: Principal,
    ) -> IcrcLedgerClient<PocketIcClient> {
        IcrcLedgerClient::new(
            self.new_client(self.get_icrc_token_principal(token_name).unwrap(), caller),
        )
    }

    /// Gets an ICRC token principal by name
    pub fn get_icrc_token_principal(&self, token_name: &str) -> Option<Principal> {
        self.icrc_token_map.get(token_name).copied()
    }

    /// Creates a new ICRC7 ledger client from the `PocketIc` client of this context,
    /// bound to the `icrc7_ledger_principal` and the given `caller
    pub fn new_icrc7_ledger_client(&self, caller: Principal) -> Icrc7Client<PocketIcClient> {
        Icrc7Client::new(self.new_client(self.icrc7_ledger_principal, caller))
    }

    /// Advances the time of the local IC to the given duration.
    ///
    /// `tick` is called after advancing the time, to ensure that the time change is visible to the
    /// canisters.
    pub async fn advance_time(&self, time: Duration) {
        self.client.advance_time(time).await;
        self.client.tick().await;
    }

    // pub fn client(&self, canister: Principal, caller: &str) -> PocketIcClient {
    //     let caller_principal = self.principal_of(caller);
    //     self.client_with_principal_caller(canister, caller_principal)
    // }

    /// Creates a new canister with the given `sender` principal as the caller.
    ///
    /// If `sender` is `None`, the caller is the default anonymous principal.
    ///
    /// After creating the canister, this function adds the maximum amount of cycles
    /// to the canister.
    ///
    /// The created canister's principal is returned.
    pub async fn create_canister(&self, sender: Option<Principal>) -> Principal {
        let principal = self
            .client
            .create_canister_with_settings(sender, None)
            .await;
        self.client.add_cycles(principal, u128::MAX).await;
        principal
    }

    /// Installs the given `wasm` on the canister with the given `canister_id`.
    ///
    /// The `sender` is the principal of the caller of this function. If `sender` is `None`, the caller
    /// is the default anonymous principal.
    ///
    /// Before installing the canister, this function adds the maximum amount of cycles
    /// to the canister.
    ///
    /// The encoded `args` are passed to the canister's `install` method.
    pub async fn install_canister(
        &self,
        canister_id: CanisterId,
        sender: Option<Principal>,
        wasm: Vec<u8>,
        args: impl ArgumentEncoder + Send,
    ) {
        let args = candid::encode_args(args).unwrap();
        self.client.add_cycles(canister_id, u128::MAX).await;

        self.client
            .install_canister(canister_id, wasm, args, sender)
            .await;
    }

    /// Reinstalls the given `wasm` on the canister with the given `canister` principal.
    ///
    /// The `sender` is the principal of the caller of this function. If `sender` is `None`, the caller
    /// is the default anonymous principal.
    ///
    /// Before reinstalling the canister, this function adds the maximum amount of cycles
    /// to the canister.
    ///
    /// The encoded `args` are passed to the canister's `install` method.
    pub async fn reinstall_canister(
        &self,
        canister: Principal,
        sender: Option<Principal>,
        wasm: Vec<u8>,
        args: impl ArgumentEncoder + Send,
    ) {
        let args = candid::encode_args(args).unwrap();
        self.client
            .reinstall_canister(canister, wasm, args, sender)
            .await
            .unwrap();
    }

    /// Upgrades the given `canister` with the given `wasm` and `args`.
    ///
    /// The `sender` is the principal of the caller of this function. If `sender` is `None`, the caller
    /// is the default anonymous principal.
    ///
    /// Before upgrading the canister, this function adds the maximum amount of cycles
    /// to the canister.
    pub async fn upgrade_canister(
        &self,
        canister: Principal,
        sender: Option<Principal>,
        wasm: Vec<u8>,
        args: impl ArgumentEncoder + Send,
    ) {
        let args = candid::encode_args(args).unwrap();
        self.client
            .upgrade_canister(canister, wasm, args, sender)
            .await
            .unwrap();
    }
}

/// Deploys a canister with the given `bytecode` and `args`.
///
/// The `sender` is the principal of the caller of this function. If `sender` is `None`, the caller
/// is the default anonymous principal.
///
/// Before installing the canister, this function adds the maximum amount of cycles
/// to the canister.
///
/// The encoded `args` are passed to the canister's `install` method.
///
/// Returns the principal of the newly created canister.
async fn deploy_canister<T: CandidType>(
    client: &PocketIc,
    sender: Option<Principal>,
    bytecode: Vec<u8>,
    args: &T,
) -> Principal {
    let args = encode(args);
    let canister = client.create_canister().await;
    client.add_cycles(canister, u128::MAX).await;
    client
        .install_canister(canister, bytecode, args, sender)
        .await;
    canister
}

pub async fn deploy_canister_with_settings<T: CandidType>(
    client: &PocketIc,
    sender: Option<Principal>,
    settings: Option<CanisterSettings>,
    bytecode: Vec<u8>,
    args: &T,
) -> Principal {
    let args = encode(args);
    let canister = client.create_canister_with_settings(sender, settings).await;
    client.add_cycles(canister, u128::MAX).await;
    client
        .install_canister(canister, bytecode, args, sender)
        .await;
    canister
}

pub async fn deploy_canister_with_id<T: CandidType>(
    client: &PocketIc,
    sender: Option<Principal>,
    settings: Option<CanisterSettings>,
    canister_id: CanisterId,
    bytecode: Vec<u8>,
    args: &T,
) -> Principal {
    let args = encode(args);
    let canister = client
        .create_canister_with_id(sender, settings, canister_id)
        .await
        .unwrap_or_else(|_| panic!("Failed to create canister with id {canister_id}"));
    client.add_cycles(canister, u128::MAX).await;
    client
        .install_canister(canister, bytecode, args, sender)
        .await;
    canister
}

/// Retrieves the bytecode for the token storage canister.
///
/// This function uses a `OnceLock` to ensure that the bytecode is loaded only once.
/// The bytecode is loaded from the "token_storage.wasm" file located in the target artifacts directory.
///
/// Returns a `Vec<u8>` containing the bytecode of the token storage canister.
pub fn get_token_storage_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("token_storage.wasm"))
        .to_owned()
}

/// Retrieves the bytecode for the cashier_backend canister.
///
/// This function uses a `OnceLock` to ensure that the bytecode is loaded only once.
/// The bytecode is loaded from the "token_storage.wasm" file located in the target artifacts directory.
///
/// Returns a `Vec<u8>` containing the bytecode of the cashier_backend canister.
pub fn get_cashier_backend_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("cashier_backend.wasm"))
        .to_owned()
}

/// Retrieves the bytecode for the cashier_backend canister.
///
/// This function uses a `OnceLock` to ensure that the bytecode is loaded only once.
/// The bytecode is loaded from the "token_storage.wasm" file located in the target artifacts directory.
///
/// Returns a `Vec<u8>` containing the bytecode of the gate_service canister.
pub fn get_gate_service_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("gate_service.wasm"))
        .to_owned()
}

/// Retrieves the bytecode for the ICP ledger canister.
///
/// This function uses a `OnceLock` to ensure that the bytecode is loaded only once.
/// The bytecode is loaded from the "ledger-suite-icp.wasm.gz" file located in the target artifacts directory.
///
/// Returns a `Vec<u8>` containing the bytecode of the cashier_backend canister.
pub fn get_icp_ledger_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("ledger-suite-icp.wasm.gz"))
        .to_owned()
}

/// Retrieves the bytecode for the ICRC ledger canister.
///
/// This function uses a `OnceLock` to ensure that the bytecode is loaded only once.
/// The bytecode is loaded from the "ledger-suite-icrc.wasm.gz" file located in the target artifacts directory.
///
/// Returns a `Vec<u8>` containing the bytecode of the cashier_backend canister.
pub fn get_icrc_ledger_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("ledger-suite-icrc.wasm.gz"))
        .to_owned()
}

/// Loads the bytecode for a canister from the given wasm file.
///
/// The wasm file must be located in the target artifacts directory, which is
/// the directory where the `wasm` and `did` files are generated by the `candid` CLI.
///
/// The function opens the given file, reads its contents and returns it as a `Vec<u8>`.
///
/// # Panics
///
/// This function will panic if the file cannot be opened or if its content cannot be read.
pub fn load_canister_bytecode(wasm_name: &str) -> Vec<u8> {
    let dir = PathBuf::from("../../target/artifacts");
    let path = dir.join(wasm_name);

    let mut f = File::open(path).expect("File does not exists");

    let mut buffer = Vec::new();
    f.read_to_end(&mut buffer)
        .expect("Could not read file content");

    buffer
}

/// Encodes a given item into a Candid byte vector.
///
/// This function takes an item that implements the `CandidType` trait and encodes it
/// into a `Vec<u8>` using Candid encoding. It returns the encoded byte vector.
///
/// # Panics
///
/// This function will panic if the encoding process fails.
pub fn encode<T: CandidType>(item: &T) -> Vec<u8> {
    Encode!(item).expect("failed to encode item to candid")
}

/// Decodes a Candid byte vector into a given item.
///
/// This function takes a byte slice representing a Candid-encoded item
/// and decodes it into an instance of type `T`, which must implement
/// the `CandidType` and `Deserialize` traits.
///
/// # Panics
///
/// This function will panic if the decoding process fails.
pub fn decode<'a, T: CandidType + Deserialize<'a>>(bytes: &'a [u8]) -> T {
    Decode!(bytes, T).expect("failed to decode item from candid")
}
