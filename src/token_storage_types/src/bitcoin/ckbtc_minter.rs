// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Deserialize, Principal};
use std::fmt::Display;

#[derive(CandidType, Deserialize)]
pub struct GetBtcAddressArg {
    pub owner: Option<Principal>,
    pub subaccount: Option<serde_bytes::ByteBuf>,
}

#[derive(CandidType, Deserialize)]
pub struct UpdateBalanceArg {
    pub owner: Option<Principal>,
    pub subaccount: Option<serde_bytes::ByteBuf>,
}

pub type UpdateBalanceResult = Result<Vec<UtxoStatus>, UpdateBalanceError>;

#[derive(CandidType, Deserialize)]
pub enum UpdateBalanceError {
    /// A generic error reserved for future extensions.
    GenericError {
        error_message: String,
        error_code: u64,
    },
    /// The minter is overloaded, retry the request.
    /// The payload contains a human-readable message explaining what caused the unavailability.
    TemporarilyUnavailable(String),
    /// The minter is already processing another update balance request for the caller.
    AlreadyProcessing,
    /// There are no new UTXOs to process.
    NoNewUtxos {
        required_confirmations: u32,
        pending_utxos: Option<Vec<PendingUtxo>>,
        current_confirmations: Option<u32>,
    },
}

impl Display for UpdateBalanceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UpdateBalanceError::GenericError {
                error_message,
                error_code,
            } => write!(f, "GenericError (code {}): {}", error_code, error_message),
            UpdateBalanceError::TemporarilyUnavailable(msg) => {
                write!(f, "TemporarilyUnavailable: {}", msg)
            }
            UpdateBalanceError::AlreadyProcessing => {
                write!(f, "AlreadyProcessing: Another request is in progress")
            }
            UpdateBalanceError::NoNewUtxos {
                required_confirmations,
                pending_utxos: _,
                current_confirmations,
            } => write!(
                f,
                "NoNewUtxos: Required confirmations {}, Current confirmations {:?}",
                required_confirmations, current_confirmations
            ),
        }
    }
}

#[derive(CandidType, Deserialize)]
pub enum UtxoStatus {
    /// The minter ignored this UTXO because UTXO's value is too small to pay
    /// the KYT fees. This state is final, retrying [update_balance] call will
    /// have no effect on this UTXO.
    ValueTooSmall(Utxo),
    /// The KYT provider considered this UTXO to be tainted. This UTXO state is
    /// final, retrying [update_balance] call will have no effect on this UTXO.
    Tainted(Utxo),
    /// The UTXO passed the KYT check, and ckBTC has been minted.
    Minted {
        minted_amount: u64,
        block_index: u64,
        utxo: Utxo,
    },
    /// The UTXO passed the KYT check, but the minter failed to mint ckBTC
    /// because the Ledger was unavailable. Retrying the [update_balance] call
    /// should eventually advance the UTXO to the [Minted] state.
    Checked(Utxo),
}

#[derive(CandidType, Deserialize)]
pub struct Utxo {
    pub height: u32,
    pub value: u64,
    pub outpoint: UtxoOutpoint,
}

#[derive(CandidType, Deserialize)]
pub struct UtxoOutpoint {
    pub txid: serde_bytes::ByteBuf,
    pub vout: u32,
}

/// Utxos that don't have enough confirmations to be processed.
#[derive(CandidType, Deserialize)]
pub struct PendingUtxo {
    pub confirmations: u32,
    pub value: u64,
    pub outpoint: PendingUtxoOutpoint,
}

#[derive(CandidType, Deserialize)]
pub struct PendingUtxoOutpoint {
    pub txid: serde_bytes::ByteBuf,
    pub vout: u32,
}

#[derive(CandidType, Deserialize)]
pub enum MinterArg {
    Upgrade(Option<UpgradeArgs>),
    Init(InitArgs),
}

/// The initialization parameters of the minter canister.
#[derive(CandidType, Deserialize)]
pub struct InitArgs {
    /// / The canister id of the KYT canister.
    pub kyt_principal: Option<Principal>,
    /// The name of the ECDSA key to use.
    /// E.g., "dfx_test_key" on the local replica.
    pub ecdsa_key_name: String,
    /// / The minter's operation mode.
    pub mode: Mode,
    /// The minimal amount of ckBTC that can be converted to BTC.
    pub retrieve_btc_min_amount: u64,
    /// The principal of the ledger that handles ckBTC transfers.
    /// The default account of the ckBTC minter must be configured as
    /// the minting account of the ledger.
    pub ledger_id: Principal,
    /// / Maximum time in nanoseconds that a transaction should spend in the queue
    /// / before being sent.
    pub max_time_in_queue_nanos: u64,
    /// The minter will interact with this Bitcoin network.
    pub btc_network: BtcNetwork,
    /// / The minimum number of confirmations required for the minter to
    /// / accept a Bitcoin transaction.
    pub min_confirmations: Option<u32>,
    /// / The fee paid per check by the KYT canister.
    pub kyt_fee: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub enum Mode {
    /// Only specified principals can modify minter's state.
    RestrictedTo(Vec<Principal>),
    /// Only specified principals can convert BTC to ckBTC.
    DepositsRestrictedTo(Vec<Principal>),
    /// The minter does not allow any state modifications.
    ReadOnly,
    /// Anyone can interact with the minter.
    GeneralAvailability,
}

#[derive(CandidType, Deserialize)]
pub enum BtcNetwork {
    /// The public Bitcoin mainnet.
    Mainnet,
    /// A local Bitcoin regtest installation.
    Regtest,
    /// The public Bitcoin testnet.
    Testnet,
}

/// The upgrade parameters of the minter canister.
#[derive(CandidType, Deserialize)]
pub struct UpgradeArgs {
    /// / The principal of the KYT canister.
    pub kyt_principal: Option<Principal>,
    /// / If set, overrides the current minter's operation mode.
    pub mode: Option<Mode>,
    /// The minimal amount of ckBTC that the minter converts to BTC.
    pub retrieve_btc_min_amount: Option<u64>,
    /// / Maximum time in nanoseconds that a transaction should spend in the queue
    /// / before being sent.
    pub max_time_in_queue_nanos: Option<u64>,
    /// / The minimum number of confirmations required for the minter to
    /// / accept a Bitcoin transaction.
    pub min_confirmations: Option<u32>,
    /// / The fee per check by the KYT canister.
    pub kyt_fee: Option<u64>,
}
