use std::sync::OnceLock;

use candid::{Nat, Principal};
use ic_mple_client::CanisterClient;
use icrc_ledger_types::icrc1::{account::Account as IcrcAccount, transfer::TransferArg};

use crate::{
    types::{
        Icrc1TransferError, Icrc1TransferResult, IcrcArchiveOptions, IcrcInitArgs,
        IcrcLedgerArgument,
    },
    utils::{
        deploy_canister_with_id, deploy_canister_with_settings, load_canister_bytecode,
        principal::get_user_principal,
    },
};

#[derive(Debug, Clone)]
pub struct IcrcLedgerClient<C>
where
    C: CanisterClient,
{
    /// The canister client.
    client: C,
}

impl<C: CanisterClient> IcrcLedgerClient<C> {
    pub fn new(client: C) -> Self {
        Self { client }
    }

    // Method to transfer ICRC tokens
    pub async fn transfer(
        &self,
        to_account: IcrcAccount,
        amount: u64,
    ) -> Result<Nat, Icrc1TransferError> {
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

    // Method to get the balance of an ICRC account
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

/// Deploys a single ICRC ledger canister with the specified parameters
pub async fn deploy_single_icrc_ledger_canister(
    client: &ic_mple_pocket_ic::pocket_ic::nonblocking::PocketIc,
    name: String,
    symbol: String,
    decimal: u8,
    fee: u64,
    id: Option<Principal>,
) -> Principal {
    let token_deployer_pid = get_user_principal("token_deployer");

    let ledger_init_input = IcrcInitArgs {
        decimals: Some(decimal),
        token_symbol: symbol,
        transfer_fee: Nat::from(fee),
        metadata: vec![],
        minting_account: IcrcAccount {
            owner: token_deployer_pid,
            subaccount: None,
        },
        initial_balances: vec![],
        fee_collector_account: None,
        archive_options: IcrcArchiveOptions {
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
        token_name: name,
        feature_flags: None,
    };

    match id {
        Some(id) => {
            deploy_canister_with_id(
                client,
                Some(token_deployer_pid),
                None,
                id,
                get_icrc_ledger_canister_bytecode(),
                &IcrcLedgerArgument::Init(ledger_init_input),
            )
            .await
        }
        None => {
            deploy_canister_with_settings(
                client,
                Some(token_deployer_pid),
                None,
                get_icrc_ledger_canister_bytecode(),
                &IcrcLedgerArgument::Init(ledger_init_input),
            )
            .await
        }
    }
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
