// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
use candid::{self, CandidType, Deserialize, Principal};
use cashier_backend_types::error::CanisterError;
use ic_cdk::call::{Call, CandidDecodeFailed};

pub type SubAccount = serde_bytes::ByteBuf;
#[derive(CandidType, Deserialize, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<SubAccount>,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct FeatureFlags {
    #[serde(rename = "icrc2")]
    pub icrc_2: bool,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct UpgradeArgs {
    #[serde(rename = "icrc1_minting_account")]
    pub icrc_1_minting_account: Option<Account>,
    pub feature_flags: Option<FeatureFlags>,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Tokens {
    #[serde(rename = "e8s")]
    pub e_8_s: u64,
}
pub type TextAccountIdentifier = String;
#[derive(CandidType, Deserialize, Debug)]
pub struct Duration {
    pub secs: u64,
    pub nanos: u32,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct ArchiveOptions {
    pub num_blocks_to_archive: u64,
    pub max_transactions_per_response: Option<u64>,
    pub trigger_threshold: u64,
    pub more_controller_ids: Option<Vec<Principal>>,
    pub max_message_size_bytes: Option<u64>,
    pub cycles_for_archive_creation: Option<u64>,
    pub node_max_memory_size_bytes: Option<u64>,
    pub controller_id: Principal,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct InitArgs {
    pub send_whitelist: Vec<Principal>,
    pub token_symbol: Option<String>,
    pub transfer_fee: Option<Tokens>,
    pub minting_account: TextAccountIdentifier,
    pub transaction_window: Option<Duration>,
    pub max_message_size_bytes: Option<u64>,
    #[serde(rename = "icrc1_minting_account")]
    pub icrc_1_minting_account: Option<Account>,
    pub archive_options: Option<ArchiveOptions>,
    pub initial_values: Vec<(TextAccountIdentifier, Tokens)>,
    pub token_name: Option<String>,
    pub feature_flags: Option<FeatureFlags>,
}

pub type AccountIdentifier = serde_bytes::ByteBuf;
#[derive(CandidType, Deserialize, Debug)]
pub struct AccountBalanceArgs {
    pub account: AccountIdentifier,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct AccountBalanceArgsDfx {
    pub account: TextAccountIdentifier,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Archive {
    pub canister_id: Principal,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Archives {
    pub archives: Vec<Archive>,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct DecimalsRet {
    pub decimals: u32,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct GetAllowancesArgs {
    pub prev_spender_id: Option<TextAccountIdentifier>,
    pub from_account_id: TextAccountIdentifier,
    pub take: Option<u64>,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct AllowancesItem {
    pub from_account_id: TextAccountIdentifier,
    pub to_spender_id: TextAccountIdentifier,
    pub allowance: Tokens,
    pub expires_at: Option<u64>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc10SupportedStandardsRetItem {
    pub url: String,
    pub name: String,
}
pub type Icrc1Tokens = candid::Nat;
#[derive(CandidType, Deserialize, Debug)]
pub enum Value {
    Int(candid::Int),
    Nat(candid::Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc1SupportedStandardsRetItem {
    pub url: String,
    pub name: String,
}
pub type Icrc1Timestamp = u64;
#[derive(CandidType, Deserialize, Debug)]
pub struct TransferArg {
    pub to: Account,
    pub fee: Option<Icrc1Tokens>,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<SubAccount>,
    pub created_at_time: Option<Icrc1Timestamp>,
    pub amount: Icrc1Tokens,
}
pub type Icrc1BlockIndex = candid::Nat;
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
#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc21ConsentMessageMetadata {
    pub utc_offset_minutes: Option<i16>,
    pub language: String,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum Icrc21ConsentMessageSpecDeviceSpecInner {
    GenericDisplay,
    LineDisplay {
        characters_per_line: u16,
        lines_per_page: u16,
    },
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc21ConsentMessageSpec {
    pub metadata: Icrc21ConsentMessageMetadata,
    pub device_spec: Option<Icrc21ConsentMessageSpecDeviceSpecInner>,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc21ConsentMessageRequest {
    pub arg: serde_bytes::ByteBuf,
    pub method: String,
    pub user_preferences: Icrc21ConsentMessageSpec,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc21ConsentMessageLineDisplayMessagePagesItem {
    pub lines: Vec<String>,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum Icrc21ConsentMessage {
    LineDisplayMessage {
        pages: Vec<Icrc21ConsentMessageLineDisplayMessagePagesItem>,
    },
    GenericDisplayMessage(String),
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc21ConsentInfo {
    pub metadata: Icrc21ConsentMessageMetadata,
    pub consent_message: Icrc21ConsentMessage,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc21ErrorInfo {
    pub description: String,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum Icrc21Error {
    GenericError {
        description: String,
        error_code: candid::Nat,
    },
    InsufficientPayment(Icrc21ErrorInfo),
    UnsupportedCanisterCall(Icrc21ErrorInfo),
    ConsentMessageUnavailable(Icrc21ErrorInfo),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct AllowanceArgs {
    pub account: Account,
    pub spender: Account,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Allowance {
    pub allowance: Icrc1Tokens,
    pub expires_at: Option<Icrc1Timestamp>,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct ApproveArgs {
    pub fee: Option<Icrc1Tokens>,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<SubAccount>,
    pub created_at_time: Option<Icrc1Timestamp>,
    pub amount: Icrc1Tokens,
    pub expected_allowance: Option<Icrc1Tokens>,
    pub expires_at: Option<Icrc1Timestamp>,
    pub spender: Account,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum ApproveError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    Duplicate {
        duplicate_of: Icrc1BlockIndex,
    },
    BadFee {
        expected_fee: Icrc1Tokens,
    },
    AllowanceChanged {
        current_allowance: Icrc1Tokens,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    Expired {
        ledger_time: u64,
    },
    InsufficientFunds {
        balance: Icrc1Tokens,
    },
}

#[derive(CandidType, Deserialize, Debug)]
pub struct TransferFromArgs {
    pub to: Account,
    pub fee: Option<Icrc1Tokens>,
    pub spender_subaccount: Option<SubAccount>,
    pub from: Account,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<Icrc1Timestamp>,
    pub amount: Icrc1Tokens,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum TransferFromError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    InsufficientAllowance {
        allowance: Icrc1Tokens,
    },
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
        ledger_time: Icrc1Timestamp,
    },
    TooOld,
    InsufficientFunds {
        balance: Icrc1Tokens,
    },
}
pub type TransferFromResult = std::result::Result<Icrc1BlockIndex, TransferFromError>;
#[derive(CandidType, Deserialize, Debug)]
pub struct NameRet {
    pub name: String,
}
pub type BlockIndex = u64;
#[derive(CandidType, Deserialize, Debug)]
pub struct GetBlocksArgs {
    pub start: BlockIndex,
    pub length: u64,
}
pub type Memo = u64;
#[derive(CandidType, Deserialize, Debug)]
pub struct TimeStamp {
    pub timestamp_nanos: u64,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum Operation {
    Approve {
        fee: Tokens,
        from: AccountIdentifier,
        #[serde(rename = "allowance_e8s")]
        allowance_e_8_s: candid::Int,
        allowance: Tokens,
        expected_allowance: Option<Tokens>,
        expires_at: Option<TimeStamp>,
        spender: AccountIdentifier,
    },
    Burn {
        from: AccountIdentifier,
        amount: Tokens,
        spender: Option<AccountIdentifier>,
    },
    Mint {
        to: AccountIdentifier,
        amount: Tokens,
    },
    Transfer {
        to: AccountIdentifier,
        fee: Tokens,
        from: AccountIdentifier,
        amount: Tokens,
        spender: Option<serde_bytes::ByteBuf>,
    },
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Transaction {
    pub memo: Memo,
    #[serde(rename = "icrc1_memo")]
    pub icrc_1_memo: Option<serde_bytes::ByteBuf>,
    pub operation: Option<Operation>,
    pub created_at_time: TimeStamp,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Block {
    pub transaction: Transaction,
    pub timestamp: TimeStamp,
    pub parent_hash: Option<serde_bytes::ByteBuf>,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct BlockRange {
    pub blocks: Vec<Block>,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum QueryArchiveError {
    BadFirstBlockIndex {
        requested_index: BlockIndex,
        first_valid_index: BlockIndex,
    },
    Other {
        error_message: String,
        error_code: u64,
    },
}

#[derive(CandidType, Deserialize, Debug)]
pub struct SendArgs {
    pub to: TextAccountIdentifier,
    pub fee: Tokens,
    pub memo: Memo,
    pub from_subaccount: Option<SubAccount>,
    pub created_at_time: Option<TimeStamp>,
    pub amount: Tokens,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct SymbolRet {
    pub symbol: String,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct TransferArgs {
    pub to: AccountIdentifier,
    pub fee: Tokens,
    pub memo: Memo,
    pub from_subaccount: Option<SubAccount>,
    pub created_at_time: Option<TimeStamp>,
    pub amount: Tokens,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum TransferError {
    TxTooOld { allowed_window_nanos: u64 },
    BadFee { expected_fee: Tokens },
    TxDuplicate { duplicate_of: BlockIndex },
    TxCreatedInFuture,
    InsufficientFunds { balance: Tokens },
}
#[derive(CandidType, Deserialize, Debug)]
pub struct TransferFeeArg {}
#[derive(CandidType, Deserialize, Debug)]
pub struct TransferFee {
    pub transfer_fee: Tokens,
}

pub struct Service(pub Principal);
impl Service {
    pub fn new(principal: Principal) -> Self {
        Service(principal)
    }

    pub fn get_canister_id(&self) -> Principal {
        self.0
    }

    pub async fn icrc_1_balance_of(&self, arg0: &Account) -> Result<Icrc1Tokens, CanisterError> {
        let res = Call::unbounded_wait(self.0, "icrc1_balance_of")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1Tokens, CandidDecodeFailed> = res.candid();

        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_1_fee(&self) -> Result<Icrc1Tokens, CanisterError> {
        let res = Call::unbounded_wait(self.0, "icrc1_fee")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1Tokens, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }
    pub async fn icrc_1_transfer(
        &self,
        arg0: &TransferArg,
    ) -> Result<Icrc1TransferResult, CanisterError> {
        let res = Call::unbounded_wait(self.0, "icrc1_transfer")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1TransferResult, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }
    pub async fn icrc_2_allowance(&self, arg0: &AllowanceArgs) -> Result<Allowance, CanisterError> {
        let res = Call::unbounded_wait(self.0, "icrc2_allowance")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Allowance, CandidDecodeFailed> = res.candid();

        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_2_transfer_from(
        &self,
        arg0: &TransferFromArgs,
    ) -> Result<TransferFromResult, CanisterError> {
        let res = Call::unbounded_wait(self.0, "icrc2_transfer_from")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<TransferFromResult, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }
}
