use std::sync::{Arc, OnceLock};

use crate::{
    types::{IcpFeatureFlags, IcpInitArgs, IcpLedgerCanisterPayload, Icrc1TransferResult, Tokens},
    utils::{
        deploy_canister_with_id, deploy_canister_with_id_sync, load_canister_bytecode,
        principal::TestUser,
    },
};
use candid::{Nat, Principal};
use ic_ledger_types::{AccountIdentifier, DEFAULT_SUBACCOUNT};
use ic_mple_client::CanisterClient;
use icrc_ledger_types::icrc1::transfer::TransferArg;
use icrc_ledger_types::icrc1::{account::Account as IcrcAccount, transfer::TransferError};

#[derive(Debug, Clone)]
pub struct IcpLedgerClient<C>
where
    C: CanisterClient,
{
    /// The canister client.
    client: C,
}

impl<C: CanisterClient> IcpLedgerClient<C> {
    pub fn new(client: C) -> Self {
        Self { client }
    }

    // Ledger ICP transfer
    pub async fn transfer(
        &self,
        to_account: IcrcAccount,
        amount: u64,
    ) -> Result<Nat, TransferError> {
        let transfer_args = TransferArg {
            memo: None,
            amount: candid::Nat::from(amount),
            fee: None,
            from_subaccount: None,
            to: to_account,
            created_at_time: None,
        };

        let res: Result<Icrc1TransferResult, ic_mple_client::CanisterClientError> =
            self.client.update("icrc1_transfer", (transfer_args,)).await;

        let res = res
            .map_err(|e| format!("ICRC transfer failed: {e:?}"))
            .unwrap();

        res
    }

    pub async fn balance_of(
        &self,
        account: &IcrcAccount,
    ) -> Result<Nat, ic_mple_client::CanisterClientError> {
        let balance: Result<Nat, ic_mple_client::CanisterClientError> =
            self.client.query("icrc1_balance_of", (account,)).await;

        balance
    }

    pub async fn fee(&self) -> Result<Nat, ic_mple_client::CanisterClientError> {
        let fee: Result<Nat, ic_mple_client::CanisterClientError> =
            self.client.query("icrc1_fee", ()).await;

        fee
    }
}

/// Deploys ICP ledger canister and returns the ICP ledger principal
pub async fn deploy_icp_ledger_canister(
    client: &ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc,
) -> Principal {
    let token_deployer_pid = TestUser::TokenDeployer.get_principal();

    let icp_init_args = IcpInitArgs {
        minting_account: AccountIdentifier::new(&token_deployer_pid, &DEFAULT_SUBACCOUNT)
            .to_string(),
        initial_values: vec![],
        send_whitelist: vec![],
        transfer_fee: Some(Tokens { e_8_s: 10000 }),
        token_symbol: Some("ICP".to_string()),
        token_name: Some("ICP".to_string()),
        feature_flags: Some(IcpFeatureFlags { icrc2: true }),
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
        &(IcpLedgerCanisterPayload::Init(icp_init_args)),
    )
    .await;

    icp_ledger_principal
}

/// Deploys ICP ledger canister and returns the ICP ledger principal synchronously
pub fn deploy_icp_ledger_canister_sync(
    client: &Arc<ic_mple_pocket_ic::pocket_ic::PocketIc>,
) -> Principal {
    let token_deployer_pid = TestUser::TokenDeployer.get_principal();

    let icp_init_args = IcpInitArgs {
        minting_account: AccountIdentifier::new(&token_deployer_pid, &DEFAULT_SUBACCOUNT)
            .to_string(),
        initial_values: vec![],
        send_whitelist: vec![],
        transfer_fee: Some(Tokens { e_8_s: 10000 }),
        token_symbol: Some("ICP".to_string()),
        token_name: Some("ICP".to_string()),
        feature_flags: Some(IcpFeatureFlags { icrc2: true }),
        icrc_1_minting_account: None,
        transaction_window: None,
        archive_options: None,
        max_message_size_bytes: None,
    };

    let icp_canister_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

    deploy_canister_with_id_sync(
        client,
        Some(token_deployer_pid),
        None,
        icp_canister_id,
        get_icp_ledger_canister_bytecode(),
        &(IcpLedgerCanisterPayload::Init(icp_init_args)),
    )
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
