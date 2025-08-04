use std::{
    collections::HashMap,
    fs::File,
    io::Read,
    path::PathBuf,
    sync::{Arc, OnceLock},
    time::Duration,
};

use candid::{utils::ArgumentEncoder, CandidType, Decode, Encode, Principal};
use cashier_backend_client::client::CashierBackendClient;
use ic_cdk::management_canister::{CanisterId, CanisterSettings};
use ic_mple_client::PocketIcClient;
use ic_mple_pocket_ic::{get_pocket_ic_client, pocket_ic::nonblocking::PocketIc};
use serde::Deserialize;
use token_storage_client::client::TokenStorageClient;

pub mod icrc_112;
pub mod principal;
pub mod token_icp;
pub mod token_icrc;

/// Executes the provided asynchronous function within a `PocketIcTestContext` environment.
///
/// This function sets up a client and deploys a canister with the provided bytecode to the local
/// IC instance. It then executes the given asynchronous function `f` with the initialized
/// `PocketIcTestContext`, which contains the client and the canister's principal.
pub async fn with_pocket_ic_context<F, E>(f: F) -> Result<(), E>
where
    F: AsyncFnOnce(&PocketIcTestContext) -> Result<(), E>,
{
    let client = Arc::new(get_pocket_ic_client().await.build_async().await);
    let token_storage_principal =
        deploy_canister(&client, None, get_token_storage_canister_bytecode(), &()).await;

    let cashier_backend_principal =
        deploy_canister(&client, None, get_cashier_backend_canister_bytecode(), &()).await;

    // Deploy ICP and ICRC ledger canisters
    let icp_ledger_principal = token_icp::deploy_icp_ledger_canister(&client).await;
    let icrc_token_map = token_icrc::deploy_icrc_ledger_canisters(&client).await;

    let result = f(&PocketIcTestContext {
        client: client.clone(),
        token_storage_principal,
        cashier_backend_principal,
        icp_ledger_principal,
        icrc_token_map,
    })
    .await;

    if let Ok(client) = Arc::try_unwrap(client) {
        client.drop().await
    }

    result
}

/// A test context that provides access to a `PocketIc` client and a deployed canister.
#[derive(Clone)]
pub struct PocketIcTestContext {
    pub client: Arc<PocketIc>,
    pub token_storage_principal: Principal,
    pub cashier_backend_principal: Principal,
    pub icp_ledger_principal: Principal,
    pub icrc_token_map: HashMap<String, Principal>,
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

    /// Creates a new `TokenStorageClient` from the `PocketIc` client of this context,
    /// bound to the `token_storage_principal` and the given `caller`.
    pub fn new_token_storage_client(
        &self,
        caller: Principal,
    ) -> TokenStorageClient<PocketIcClient> {
        TokenStorageClient::new(self.new_client(self.token_storage_principal, caller))
    }

    /// Creates a new ICP ledger client for the given caller
    pub fn new_icp_ledger_client(&self, caller: Principal) -> PocketIcClient {
        token_icp::new_icp_ledger_client(self, self.icp_ledger_principal, caller)
    }

    /// Creates a new ICRC ledger client for the given token and caller
    pub fn new_icrc_ledger_client(
        &self,
        token_name: &str,
        caller: Principal,
    ) -> Option<PocketIcClient> {
        let token_principal = self.get_icrc_token_principal(token_name)?;
        Some(token_icrc::new_icrc_ledger_client(
            self,
            token_principal,
            caller,
        ))
    }

    /// Creates ICRC ledger clies for all tokens with the given caller
    pub fn new_all_icrc_ledger_clients(
        &self,
        caller: Principal,
    ) -> HashMap<String, PocketIcClient> {
        token_icrc::new_all_icrc_ledger_clients(self, &self.icrc_token_map, caller)
    }

    /// Gets the ICP ledger principal
    pub fn icp_ledger_principal(&self) -> Principal {
        self.icp_ledger_principal
    }

    /// Gets an ICRC token principal by name
    pub fn get_icrc_token_principal(&self, token_name: &str) -> Option<Principal> {
        self.icrc_token_map.get(token_name).copied()
    }

    /// Gets all ICRC token names
    pub fn get_icrc_token_names(&self) -> Vec<String> {
        self.icrc_token_map.keys().cloned().collect()
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

async fn deploy_canister_with_settings<T: CandidType>(
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

async fn deploy_canister_with_id<T: CandidType>(
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
fn load_canister_bytecode(wasm_name: &str) -> Vec<u8> {
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
