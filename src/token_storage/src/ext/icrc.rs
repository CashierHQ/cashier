// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
#![allow(dead_code, unused_imports)]
use candid::{self, CandidType, Deserialize, Principal};
use core::fmt;
use ic_cdk::api::call::CallResult as Result;
use serde::Serialize;
use std::vec::Vec as StdVec;
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ChangeArchiveOptions {
    pub num_blocks_to_archive: Option<u64>,
    pub max_transactions_per_response: Option<u64>,
    pub trigger_threshold: Option<u64>,
    pub more_controller_ids: Option<StdVec<Principal>>,
    pub max_message_size_bytes: Option<u64>,
    pub cycles_for_archive_creation: Option<u64>,
    pub node_max_memory_size_bytes: Option<u64>,
    pub controller_id: Option<Principal>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum MetadataValue {
    Int(candid::Int),
    Nat(candid::Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
}
#[derive(CandidType, Deserialize, Clone, Debug, Serialize)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<serde_bytes::ByteBuf>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ChangeFeeCollector {
    SetTo(Account),
    Unset,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct FeatureFlags {
    #[serde(rename = "icrc2")]
    pub icrc_2: bool,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UpgradeArgs {
    pub change_archive_options: Option<ChangeArchiveOptions>,
    pub token_symbol: Option<String>,
    pub transfer_fee: Option<candid::Nat>,
    pub metadata: Option<StdVec<(String, MetadataValue)>>,
    pub accounts_overflow_trim_quantity: Option<u64>,
    pub change_fee_collector: Option<ChangeFeeCollector>,
    pub max_memo_length: Option<u16>,
    pub token_name: Option<String>,
    pub feature_flags: Option<FeatureFlags>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ArchiveOptions {
    pub num_blocks_to_archive: u64,
    pub max_transactions_per_response: Option<u64>,
    pub trigger_threshold: u64,
    pub more_controller_ids: Option<StdVec<Principal>>,
    pub max_message_size_bytes: Option<u64>,
    pub cycles_for_archive_creation: Option<u64>,
    pub node_max_memory_size_bytes: Option<u64>,
    pub controller_id: Principal,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct InitArgs {
    pub decimals: Option<u8>,
    pub token_symbol: String,
    pub transfer_fee: candid::Nat,
    pub metadata: StdVec<(String, MetadataValue)>,
    pub minting_account: Account,
    pub initial_balances: StdVec<(Account, candid::Nat)>,
    pub maximum_number_of_accounts: Option<u64>,
    pub accounts_overflow_trim_quantity: Option<u64>,
    pub fee_collector_account: Option<Account>,
    pub archive_options: ArchiveOptions,
    pub max_memo_length: Option<u16>,
    pub token_name: String,
    pub feature_flags: Option<FeatureFlags>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum LedgerArgument {
    Upgrade(Option<UpgradeArgs>),
    Init(InitArgs),
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ArchiveInfo {
    pub block_range_end: candid::Nat,
    pub canister_id: Principal,
    pub block_range_start: candid::Nat,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetBlocksRequest {
    pub start: candid::Nat,
    pub length: candid::Nat,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum VecItem {
    Int(candid::Int),
    Map(StdVec<(String, Box<Value>)>),
    Nat(candid::Nat),
    Nat64(u64),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(Box<Vec>),
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Vec(pub StdVec<VecItem>);
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum Value {
    Int(candid::Int),
    Map(StdVec<(String, Box<Value>)>),
    Nat(candid::Nat),
    Nat64(u64),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(Box<Vec>),
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BlockRange {
    pub blocks: StdVec<Box<Value>>,
}
candid::define_function!(pub ArchivedRangeCallback : (GetBlocksRequest) -> (
    BlockRange,
  ) query);
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ArchivedRange {
    pub callback: ArchivedRangeCallback,
    pub start: candid::Nat,
    pub length: candid::Nat,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetBlocksResponse {
    pub certificate: Option<serde_bytes::ByteBuf>,
    pub first_index: candid::Nat,
    pub blocks: StdVec<Box<Value>>,
    pub chain_length: u64,
    pub archived_blocks: StdVec<ArchivedRange>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DataCertificate {
    pub certificate: Option<serde_bytes::ByteBuf>,
    pub hash_tree: serde_bytes::ByteBuf,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct HolderListMetadata {
    pub total: u64,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct HolderData {
    pub account: Account,
    pub amount: candid::Nat,
    pub percentage: f64,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct HolderListResp {
    pub metadata: HolderListMetadata,
    pub data: StdVec<HolderData>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Burn {
    pub from: Account,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub amount: candid::Nat,
    pub spender: Option<Account>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Mint {
    pub to: Account,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub amount: candid::Nat,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Approve {
    pub fee: Option<candid::Nat>,
    pub from: Account,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub amount: candid::Nat,
    pub expected_allowance: Option<candid::Nat>,
    pub expires_at: Option<u64>,
    pub spender: Account,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Transfer {
    pub to: Account,
    pub fee: Option<candid::Nat>,
    pub from: Account,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub amount: candid::Nat,
    pub spender: Option<Account>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Transaction {
    pub burn: Option<Burn>,
    pub kind: String,
    pub mint: Option<Mint>,
    pub approve: Option<Approve>,
    pub timestamp: u64,
    pub transfer: Option<Transfer>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransactionRange {
    pub transactions: StdVec<Transaction>,
}
candid::define_function!(pub ArchivedRange1Callback : (GetBlocksRequest) -> (
    TransactionRange,
  ) query);
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ArchivedRange1 {
    pub callback: ArchivedRange1Callback,
    pub start: candid::Nat,
    pub length: candid::Nat,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetTransactionsResponse {
    pub first_index: candid::Nat,
    pub log_length: candid::Nat,
    pub transactions: StdVec<Transaction>,
    pub archived_transactions: StdVec<ArchivedRange1>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct StandardRecord {
    pub url: String,
    pub name: String,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferArg {
    pub to: Account,
    pub fee: Option<candid::Nat>,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub amount: candid::Nat,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransferError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    BadBurn {
        min_burn_amount: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    BadFee {
        expected_fee: candid::Nat,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: candid::Nat,
    },
}

impl fmt::Display for TransferError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TransferError::GenericError {
                message,
                error_code,
            } => {
                write!(f, "GenericError: {}, ErrorCode: {}", message, error_code)
            }
            TransferError::TemporarilyUnavailable => {
                write!(f, "TemporarilyUnavailable")
            }
            TransferError::BadBurn { min_burn_amount } => {
                write!(f, "BadBurn: MinBurnAmount: {}", min_burn_amount)
            }
            TransferError::Duplicate { duplicate_of } => {
                write!(f, "Duplicate: DuplicateOf: {}", duplicate_of)
            }
            TransferError::BadFee { expected_fee } => {
                write!(f, "BadFee: ExpectedFee: {}", expected_fee)
            }
            TransferError::CreatedInFuture { ledger_time } => {
                write!(f, "CreatedInFuture: LedgerTime: {}", ledger_time)
            }
            TransferError::TooOld => {
                write!(f, "TooOld")
            }
            TransferError::InsufficientFunds { balance } => {
                write!(f, "InsufficientFunds: Balance: {}", balance)
            }
        }
    }
}

// You might also want to implement From<TransferError> for String
impl From<TransferError> for String {
    fn from(error: TransferError) -> Self {
        error.to_string()
    }
}
pub type Result_ = std::result::Result<candid::Nat, TransferError>;
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ConsentMessageMetadata {
    pub utc_offset_minutes: Option<i16>,
    pub language: String,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum DisplayMessageType {
    GenericDisplay,
    LineDisplay {
        characters_per_line: u16,
        lines_per_page: u16,
    },
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ConsentMessageSpec {
    pub metadata: ConsentMessageMetadata,
    pub device_spec: Option<DisplayMessageType>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ConsentMessageRequest {
    pub arg: serde_bytes::ByteBuf,
    pub method: String,
    pub user_preferences: ConsentMessageSpec,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct LineDisplayPage {
    pub lines: StdVec<String>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ConsentMessage {
    LineDisplayMessage { pages: StdVec<LineDisplayPage> },
    GenericDisplayMessage(String),
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ConsentInfo {
    pub metadata: ConsentMessageMetadata,
    pub consent_message: ConsentMessage,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ErrorInfo {
    pub description: String,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum Icrc21Error {
    GenericError {
        description: String,
        error_code: candid::Nat,
    },
    InsufficientPayment(ErrorInfo),
    UnsupportedCanisterCall(ErrorInfo),
    ConsentMessageUnavailable(ErrorInfo),
}
pub type Result1 = std::result::Result<ConsentInfo, Icrc21Error>;
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AllowanceArgs {
    pub account: Account,
    pub spender: Account,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Allowance {
    pub allowance: candid::Nat,
    pub expires_at: Option<u64>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ApproveArgs {
    pub fee: Option<candid::Nat>,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub amount: candid::Nat,
    pub expected_allowance: Option<candid::Nat>,
    pub expires_at: Option<u64>,
    pub spender: Account,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum ApproveError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    Duplicate {
        duplicate_of: candid::Nat,
    },
    BadFee {
        expected_fee: candid::Nat,
    },
    AllowanceChanged {
        current_allowance: candid::Nat,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    Expired {
        ledger_time: u64,
    },
    InsufficientFunds {
        balance: candid::Nat,
    },
}
pub type Result2 = std::result::Result<candid::Nat, ApproveError>;
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferFromArgs {
    pub to: Account,
    pub fee: Option<candid::Nat>,
    pub spender_subaccount: Option<serde_bytes::ByteBuf>,
    pub from: Account,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub amount: candid::Nat,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransferFromError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    InsufficientAllowance {
        allowance: candid::Nat,
    },
    BadBurn {
        min_burn_amount: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    BadFee {
        expected_fee: candid::Nat,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: candid::Nat,
    },
}
pub type Result3 = std::result::Result<candid::Nat, TransferFromError>;
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetArchivesArgs {
    pub from: Option<Principal>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Icrc3ArchiveInfo {
    pub end: candid::Nat,
    pub canister_id: Principal,
    pub start: candid::Nat,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum Icrc3Value {
    Int(candid::Int),
    Map(StdVec<(String, Box<Icrc3Value>)>),
    Nat(candid::Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(StdVec<Box<Icrc3Value>>),
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BlockWithId {
    pub id: candid::Nat,
    pub block: Box<Icrc3Value>,
}
candid::define_function!(pub ArchivedBlocksCallback : (
    StdVec<GetBlocksRequest>,
  ) -> (GetBlocksResult) query);
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ArchivedBlocks {
    pub args: StdVec<GetBlocksRequest>,
    pub callback: ArchivedBlocksCallback,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetBlocksResult {
    pub log_length: candid::Nat,
    pub blocks: StdVec<BlockWithId>,
    pub archived_blocks: StdVec<ArchivedBlocks>,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Icrc3DataCertificate {
    pub certificate: serde_bytes::ByteBuf,
    pub hash_tree: serde_bytes::ByteBuf,
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SupportedBlockType {
    pub url: String,
    pub block_type: String,
}

pub struct Service(pub Principal);

impl Service {
    pub fn new(canister_id: Principal) -> Self {
        Self(canister_id)
    }

    pub fn get_canister_id(&self) -> &Principal {
        &self.0
    }

    pub async fn archives(&self) -> Result<(StdVec<ArchiveInfo>,)> {
        ic_cdk::call(self.0, "archives", ()).await
    }
    pub async fn get_blocks(&self, arg0: &GetBlocksRequest) -> Result<(GetBlocksResponse,)> {
        ic_cdk::call(self.0, "get_blocks", (arg0,)).await
    }
    pub async fn get_data_certificate(&self) -> Result<(DataCertificate,)> {
        ic_cdk::call(self.0, "get_data_certificate", ()).await
    }
    pub async fn get_top(&self, arg0: &u32) -> Result<(HolderListResp,)> {
        ic_cdk::call(self.0, "get_top", (arg0,)).await
    }
    pub async fn get_top_100_holder(&self) -> Result<(HolderListResp,)> {
        ic_cdk::call(self.0, "get_top_100_holder", ()).await
    }
    pub async fn get_total_holder(&self) -> Result<(u64,)> {
        ic_cdk::call(self.0, "get_total_holder", ()).await
    }
    pub async fn get_transactions(
        &self,
        arg0: &GetBlocksRequest,
    ) -> Result<(GetTransactionsResponse,)> {
        ic_cdk::call(self.0, "get_transactions", (arg0,)).await
    }
    pub async fn icrc_10_supported_standards(&self) -> Result<(StdVec<StandardRecord>,)> {
        ic_cdk::call(self.0, "icrc10_supported_standards", ()).await
    }
    pub async fn icrc_1_balance_of(&self, arg0: &Account) -> Result<(candid::Nat,)> {
        ic_cdk::call(self.0, "icrc1_balance_of", (arg0,)).await
    }
    pub async fn icrc_1_decimals(&self) -> Result<(u8,)> {
        ic_cdk::call(self.0, "icrc1_decimals", ()).await
    }
    pub async fn icrc_1_fee(&self) -> Result<(candid::Nat,)> {
        ic_cdk::call(self.0, "icrc1_fee", ()).await
    }
    pub async fn icrc_1_metadata(&self) -> Result<(StdVec<(String, MetadataValue)>,)> {
        ic_cdk::call(self.0, "icrc1_metadata", ()).await
    }
    pub async fn icrc_1_minting_account(&self) -> Result<(Option<Account>,)> {
        ic_cdk::call(self.0, "icrc1_minting_account", ()).await
    }
    pub async fn icrc_1_name(&self) -> Result<(String,)> {
        ic_cdk::call(self.0, "icrc1_name", ()).await
    }
    pub async fn icrc_1_supported_standards(&self) -> Result<(StdVec<StandardRecord>,)> {
        ic_cdk::call(self.0, "icrc1_supported_standards", ()).await
    }
    pub async fn icrc_1_symbol(&self) -> Result<(String,)> {
        ic_cdk::call(self.0, "icrc1_symbol", ()).await
    }
    pub async fn icrc_1_total_supply(&self) -> Result<(candid::Nat,)> {
        ic_cdk::call(self.0, "icrc1_total_supply", ()).await
    }
    pub async fn icrc_1_transfer(&self, arg0: &TransferArg) -> Result<(Result_,)> {
        ic_cdk::call(self.0, "icrc1_transfer", (arg0,)).await
    }
    pub async fn icrc_21_canister_call_consent_message(
        &self,
        arg0: &ConsentMessageRequest,
    ) -> Result<(Result1,)> {
        ic_cdk::call(self.0, "icrc21_canister_call_consent_message", (arg0,)).await
    }
    pub async fn icrc_2_allowance(&self, arg0: &AllowanceArgs) -> Result<(Allowance,)> {
        ic_cdk::call(self.0, "icrc2_allowance", (arg0,)).await
    }
    pub async fn icrc_2_approve(&self, arg0: &ApproveArgs) -> Result<(Result2,)> {
        ic_cdk::call(self.0, "icrc2_approve", (arg0,)).await
    }
    pub async fn icrc_2_transfer_from(&self, arg0: &TransferFromArgs) -> Result<(Result3,)> {
        ic_cdk::call(self.0, "icrc2_transfer_from", (arg0,)).await
    }
    pub async fn icrc_3_get_archives(
        &self,
        arg0: &GetArchivesArgs,
    ) -> Result<(StdVec<Icrc3ArchiveInfo>,)> {
        ic_cdk::call(self.0, "icrc3_get_archives", (arg0,)).await
    }
    pub async fn icrc_3_get_blocks(
        &self,
        arg0: &StdVec<GetBlocksRequest>,
    ) -> Result<(GetBlocksResult,)> {
        ic_cdk::call(self.0, "icrc3_get_blocks", (arg0,)).await
    }
    pub async fn icrc_3_get_tip_certificate(&self) -> Result<(Option<Icrc3DataCertificate>,)> {
        ic_cdk::call(self.0, "icrc3_get_tip_certificate", ()).await
    }
    pub async fn icrc_3_supported_block_types(&self) -> Result<(StdVec<SupportedBlockType>,)> {
        ic_cdk::call(self.0, "icrc3_supported_block_types", ()).await
    }
}
