// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Deserialize, Principal};

#[derive(CandidType, Deserialize)]
pub struct GetBtcAddressArg {
    pub owner: Option<Principal>,
    pub subaccount: Option<serde_bytes::ByteBuf>,
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
