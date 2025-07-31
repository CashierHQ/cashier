use std::{
    fs::File,
    io::Read,
    path::PathBuf,
    sync::{Arc, OnceLock},
    time::Duration,
};

use candid::{utils::ArgumentEncoder, CandidType, Decode, Encode, Principal};
use ic_cdk::management_canister::CanisterId;
use ic_mple_pocket_ic::{get_pocket_ic_client, pocket_ic::nonblocking::PocketIc};
use serde::Deserialize;

#[tokio::test]
async fn should_deploy_the_canister() {
    with_pocket_ic_context::<_, ()>(async move |ctx| Ok(()))
        .await
        .unwrap();
}

pub async fn with_pocket_ic_context<F, E>(f: F) -> Result<(), E>
where
    F: AsyncFnOnce(&PocketIcTestContext) -> Result<(), E>,
{
    let client = Arc::new(get_pocket_ic_client().await.build_async().await);
    let token_storage_principal =
        deploy_canister(&client, None, get_token_storage_canister_bytecode(), &()).await;

    let result = f(&PocketIcTestContext {
        client: client.clone(),
        token_storage_principal,
    })
    .await;

    if let Ok(client) = Arc::try_unwrap(client) {
        client.drop().await
    }

    result
}

#[derive(Clone)]
pub struct PocketIcTestContext {
    pub client: Arc<PocketIc>,
    token_storage_principal: Principal,
}

impl PocketIcTestContext {
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
    async fn create_canister(&self, sender: Option<Principal>) -> Principal {
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
    async fn install_canister(
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
    async fn reinstall_canister(
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

    async fn upgrade_canister(
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

pub fn get_token_storage_canister_bytecode() -> Vec<u8> {
    static CANISTER_BYTECODE: OnceLock<Vec<u8>> = OnceLock::new();
    CANISTER_BYTECODE
        .get_or_init(|| load_canister_bytecode("token_storage.wasm"))
        .to_owned()
}

fn load_canister_bytecode(wasm_name: &str) -> Vec<u8> {
    let dir = PathBuf::from("../../target/artifacts");
    let path = dir.join(wasm_name);

    let mut f = File::open(path).expect("File does not exists");

    let mut buffer = Vec::new();
    f.read_to_end(&mut buffer)
        .expect("Could not read file content");

    buffer
}

pub fn encode<T: CandidType>(item: &T) -> Vec<u8> {
    Encode!(item).expect("failed to encode item to candid")
}

pub fn decode<'a, T: CandidType + Deserialize<'a>>(bytes: &'a [u8]) -> T {
    Decode!(bytes, T).expect("failed to decode item from candid")
}
