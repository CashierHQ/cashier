use candid::CandidType;
use candid::Principal;
use serde::Deserialize;
use serde_bytes::ByteBuf;

pub type Icrc1BlockIndex = candid::Nat;
pub type Icrc1Tokens = candid::Nat;
#[derive(CandidType, Deserialize, Debug)]
pub enum Icrc1TransferError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    BadBurn {
        min_burn_amount: Icrc1Tokens,
    },
    Duplicate {
        duplicate_of: Icrc1BlockIndex,
    },
    BadFee {
        expected_fee: Icrc1Tokens,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: Icrc1Tokens,
    },
}
pub type Icrc1TransferResult = std::result::Result<Icrc1BlockIndex, Icrc1TransferError>;

// ICRC Ledger Types
#[derive(CandidType, Deserialize, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<ByteBuf>,
}

#[derive(CandidType, Deserialize)]
pub struct IcrcFeatureFlags {
    pub icrc2: bool,
}

#[derive(CandidType, Deserialize)]
pub struct IcrcArchiveOptions {
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
    Blob(ByteBuf),
    Text(String),
}

#[derive(CandidType, Deserialize)]
pub struct IcrcInitArgs {
    pub decimals: Option<u8>,
    pub token_symbol: String,
    pub transfer_fee: candid::Nat,
    pub metadata: Vec<(String, MetadataValue)>,
    pub minting_account: Account,
    pub initial_balances: Vec<(Account, candid::Nat)>,
    pub fee_collector_account: Option<Account>,
    pub archive_options: IcrcArchiveOptions,
    pub max_memo_length: Option<u16>,
    pub index_principal: Option<Principal>,
    pub token_name: String,
    pub feature_flags: Option<IcrcFeatureFlags>,
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
pub struct IcrcUpgradeArgs {
    pub change_archive_options: Option<ChangeArchiveOptions>,
    pub token_symbol: Option<String>,
    pub transfer_fee: Option<candid::Nat>,
    pub metadata: Option<Vec<(String, MetadataValue)>>,
    pub change_fee_collector: Option<ChangeFeeCollector>,
    pub max_memo_length: Option<u16>,
    pub index_principal: Option<Principal>,
    pub token_name: Option<String>,
    pub feature_flags: Option<IcrcFeatureFlags>,
}

#[derive(CandidType, Deserialize)]
pub enum IcrcLedgerArgument {
    Upgrade(Option<IcrcUpgradeArgs>),
    Init(IcrcInitArgs),
}

// ICP Ledger Types
#[derive(CandidType, Deserialize, Debug)]
pub struct IcpFeatureFlags {
    pub icrc2: bool,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct IcpUpgradeArgs {
    #[serde(rename = "icrc1_minting_account")]
    pub icrc_1_minting_account: Option<Account>,
    pub feature_flags: Option<IcpFeatureFlags>,
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
pub struct IcpArchiveOptions {
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
pub struct IcpInitArgs {
    pub send_whitelist: Vec<Principal>,
    pub token_symbol: Option<String>,
    pub transfer_fee: Option<Tokens>,
    pub minting_account: TextAccountIdentifier,
    pub transaction_window: Option<Duration>,
    pub max_message_size_bytes: Option<u64>,
    #[serde(rename = "icrc1_minting_account")]
    pub icrc_1_minting_account: Option<Account>,
    pub archive_options: Option<IcpArchiveOptions>,
    pub initial_values: Vec<(TextAccountIdentifier, Tokens)>,
    pub token_name: Option<String>,
    pub feature_flags: Option<IcpFeatureFlags>,
}

#[derive(CandidType, Deserialize, Debug)]
// ignore because this is enum defined by icp ledger
#[allow(clippy::large_enum_variant)]
pub enum IcpLedgerCanisterPayload {
    Init(IcpInitArgs),
    Upgrade(Option<IcpUpgradeArgs>),
}
