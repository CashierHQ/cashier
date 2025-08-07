use candid::CandidType;
use candid::Principal;
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::BlockIndex;
use icrc_ledger_types::icrc1::transfer::TransferError;
use serde::Deserialize;
use serde_bytes::ByteBuf;

/// Result type for ICRC1 transfer operations
/// Returns either a block index on success or a transfer error on failure
pub type Icrc1TransferResult = std::result::Result<BlockIndex, TransferError>;

/// Feature flags for ICRC ledger functionality
/// Controls which ICRC features are enabled on the ledger
#[derive(CandidType, Deserialize)]
pub struct IcrcFeatureFlags {
    /// Whether ICRC2 (approval) functionality is enabled
    pub icrc2: bool,
}

/// Configuration options for ICRC ledger archiving
/// Defines how and when the ledger should archive old transactions
#[derive(CandidType, Deserialize)]
pub struct IcrcArchiveOptions {
    /// Number of blocks to archive in each archive canister
    pub num_blocks_to_archive: u64,
    /// Maximum number of transactions to return in archive responses
    pub max_transactions_per_response: Option<u64>,
    /// Threshold that triggers archive creation
    pub trigger_threshold: u64,
    /// Additional controller principals for archive canisters
    pub more_controller_ids: Option<Vec<Principal>>,
    /// Maximum message size for archive canisters
    pub max_message_size_bytes: Option<u64>,
    /// Cycles allocated for archive canister creation
    pub cycles_for_archive_creation: Option<u64>,
    /// Maximum memory size for archive canister nodes
    pub node_max_memory_size_bytes: Option<u64>,
    /// Principal ID of the archive controller
    pub controller_id: Principal,
}

/// Metadata value types supported by ICRC ledgers
/// Used for storing additional information about tokens
#[derive(CandidType, Deserialize)]
pub enum MetadataValue {
    /// Integer value
    Int(candid::Int),
    /// Natural number value
    Nat(candid::Nat),
    /// Binary data
    Blob(ByteBuf),
    /// Text string
    Text(String),
}

/// Initialization arguments for ICRC ledger canisters
/// Contains all configuration needed to set up a new ICRC token ledger
#[derive(CandidType, Deserialize)]
pub struct IcrcInitArgs {
    /// Number of decimal places for the token
    pub decimals: Option<u8>,
    /// Symbol of the token (e.g., "ICP", "ckBTC")
    pub token_symbol: String,
    /// Fee charged for each transfer
    pub transfer_fee: candid::Nat,
    /// Additional metadata for the token
    pub metadata: Vec<(String, MetadataValue)>,
    /// Account that can mint new tokens
    pub minting_account: Account,
    /// Initial token balances for accounts
    pub initial_balances: Vec<(Account, candid::Nat)>,
    /// Account that collects transfer fees
    pub fee_collector_account: Option<Account>,
    /// Archive configuration options
    pub archive_options: IcrcArchiveOptions,
    /// Maximum length of memo field in transfers
    pub max_memo_length: Option<u16>,
    /// Principal ID for the index canister
    pub index_principal: Option<Principal>,
    /// Full name of the token
    pub token_name: String,
    /// Feature flags to enable/disable functionality
    pub feature_flags: Option<IcrcFeatureFlags>,
}

/// Arguments for changing archive options on an existing ICRC ledger
/// All fields are optional to allow partial updates
#[derive(CandidType, Deserialize)]
pub struct ChangeArchiveOptions {
    /// Number of blocks to archive in each archive canister
    pub num_blocks_to_archive: Option<u64>,
    /// Maximum number of transactions to return in archive responses
    pub max_transactions_per_response: Option<u64>,
    /// Threshold that triggers archive creation
    pub trigger_threshold: Option<u64>,
    /// Additional controller principals for archive canisters
    pub more_controller_ids: Option<Vec<Principal>>,
    /// Maximum message size for archive canisters
    pub max_message_size_bytes: Option<u64>,
    /// Cycles allocated for archive canister creation
    pub cycles_for_archive_creation: Option<u64>,
    /// Maximum memory size for archive canister nodes
    pub node_max_memory_size_bytes: Option<u64>,
    /// Principal ID of the archive controller
    pub controller_id: Option<Principal>,
}

/// Options for changing the fee collector account
/// Can either set a new fee collector or unset the current one
#[derive(CandidType, Deserialize)]
pub enum ChangeFeeCollector {
    /// Set a new fee collector account
    SetTo(Account),
    /// Remove the current fee collector
    Unset,
}

/// Upgrade arguments for ICRC ledger canisters
/// Contains optional fields for updating ledger configuration
#[derive(CandidType, Deserialize)]
pub struct IcrcUpgradeArgs {
    /// New archive options configuration
    pub change_archive_options: Option<ChangeArchiveOptions>,
    /// New token symbol
    pub token_symbol: Option<String>,
    /// New transfer fee
    pub transfer_fee: Option<candid::Nat>,
    /// New metadata configuration
    pub metadata: Option<Vec<(String, MetadataValue)>>,
    /// New fee collector configuration
    pub change_fee_collector: Option<ChangeFeeCollector>,
    /// New maximum memo length
    pub max_memo_length: Option<u16>,
    /// New index principal
    pub index_principal: Option<Principal>,
    /// New token name
    pub token_name: Option<String>,
    /// New feature flags
    pub feature_flags: Option<IcrcFeatureFlags>,
}

/// Arguments for ICRC ledger canister initialization or upgrade
/// Used when deploying or updating ICRC ledger canisters
#[derive(CandidType, Deserialize)]
pub enum IcrcLedgerArgument {
    /// Upgrade an existing ledger with new configuration
    Upgrade(Option<IcrcUpgradeArgs>),
    /// Initialize a new ledger with initial configuration
    Init(IcrcInitArgs),
}

// ICP Ledger Types

/// Feature flags for ICP ledger functionality
/// Controls which ICP features are enabled on the ledger
#[derive(CandidType, Deserialize, Debug)]
pub struct IcpFeatureFlags {
    /// Whether ICRC2 (approval) functionality is enabled
    pub icrc2: bool,
}

/// Upgrade arguments for ICP ledger canisters
/// Contains optional fields for updating ICP ledger configuration
#[derive(CandidType, Deserialize, Debug)]
pub struct IcpUpgradeArgs {
    /// ICRC1 minting account for the ICP ledger
    #[serde(rename = "icrc1_minting_account")]
    pub icrc_1_minting_account: Option<Account>,
    /// Feature flags for the ICP ledger
    pub feature_flags: Option<IcpFeatureFlags>,
}

/// Token amount representation for ICP ledger
/// Uses e8s (10^8) as the base unit for ICP amounts
#[derive(CandidType, Deserialize, Debug)]
pub struct Tokens {
    /// Amount in e8s (1 ICP = 100,000,000 e8s)
    #[serde(rename = "e8s")]
    pub e_8_s: u64,
}

/// Duration representation for ICP ledger
/// Used for time-based configurations like transaction windows
#[derive(CandidType, Deserialize, Debug)]
pub struct Duration {
    /// Duration in seconds
    pub secs: u64,
    /// Additional duration in nanoseconds
    pub nanos: u32,
}

/// Archive options for ICP ledger
/// Defines how and when the ICP ledger should archive old transactions
#[derive(CandidType, Deserialize, Debug)]
pub struct IcpArchiveOptions {
    /// Number of blocks to archive in each archive canister
    pub num_blocks_to_archive: u64,
    /// Maximum number of transactions to return in archive responses
    pub max_transactions_per_response: Option<u64>,
    /// Threshold that triggers archive creation
    pub trigger_threshold: u64,
    /// Additional controller principals for archive canisters
    pub more_controller_ids: Option<Vec<Principal>>,
    /// Maximum message size for archive canisters
    pub max_message_size_bytes: Option<u64>,
    /// Cycles allocated for archive canister creation
    pub cycles_for_archive_creation: Option<u64>,
    /// Maximum memory size for archive canister nodes
    pub node_max_memory_size_bytes: Option<u64>,
    /// Principal ID of the archive controller
    pub controller_id: Principal,
}

/// Type alias for text-based account identifiers
/// Used for ICP ledger account representation
pub type TextAccountIdentifier = String;

/// Initialization arguments for ICP ledger canisters
/// Contains all configuration needed to set up the ICP ledger
#[derive(CandidType, Deserialize, Debug)]
pub struct IcpInitArgs {
    /// List of principals allowed to send transactions
    pub send_whitelist: Vec<Principal>,
    /// Symbol of the ICP token
    pub token_symbol: Option<String>,
    /// Fee charged for each transfer
    pub transfer_fee: Option<Tokens>,
    /// Account that can mint new ICP tokens
    pub minting_account: TextAccountIdentifier,
    /// Time window for transaction processing
    pub transaction_window: Option<Duration>,
    /// Maximum message size for the ledger
    pub max_message_size_bytes: Option<u64>,
    /// ICRC1 minting account for compatibility
    #[serde(rename = "icrc1_minting_account")]
    pub icrc_1_minting_account: Option<Account>,
    /// Archive configuration options
    pub archive_options: Option<IcpArchiveOptions>,
    /// Initial ICP balances for accounts
    pub initial_values: Vec<(TextAccountIdentifier, Tokens)>,
    /// Full name of the ICP token
    pub token_name: Option<String>,
    /// Feature flags to enable/disable functionality
    pub feature_flags: Option<IcpFeatureFlags>,
}

/// Payload for ICP ledger canister initialization or upgrade
/// Used when deploying or updating the ICP ledger canister
#[derive(CandidType, Deserialize, Debug)]
// ignore because this is enum defined by icp ledger
#[allow(clippy::large_enum_variant)]
pub enum IcpLedgerCanisterPayload {
    /// Initialize a new ICP ledger with initial configuration
    Init(IcpInitArgs),
    /// Upgrade an existing ICP ledger with new configuration
    Upgrade(Option<IcpUpgradeArgs>),
}
