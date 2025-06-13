// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
#![allow(dead_code, unused_imports)]
use candid::{self, CandidType, Decode, Deserialize, Encode, Principal};
use ic_cdk::api::call::CallResult as Result;

pub type Subaccount = serde_bytes::ByteBuf;
#[derive(CandidType, Deserialize)]
pub struct Account2 {
    pub owner: Principal,
    pub subaccount: Option<Subaccount>,
}

#[derive(CandidType, Deserialize)]
pub struct BurnNftRequest {
    pub memo: Option<serde_bytes::ByteBuf>,
    pub tokens: Vec<candid::Nat>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub enum BurnNftError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    NonExistingTokenId,
    InvalidBurn,
}

#[derive(CandidType, Deserialize)]
pub enum BurnNftResult {
    Ok(candid::Nat),
    Err(BurnNftError),
}

#[derive(CandidType, Deserialize)]
pub struct BurnNftItemResponse {
    pub result: BurnNftResult,
    pub token_id: candid::Nat,
}

#[derive(CandidType, Deserialize)]
pub enum BurnNftBatchError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    Unauthorized,
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
}

#[derive(CandidType, Deserialize)]
pub enum BurnNftBatchResponse {
    Ok(Vec<BurnNftItemResponse>),
    Err(BurnNftBatchError),
}

#[derive(CandidType, Deserialize)]
pub struct Tip {
    pub last_block_index: serde_bytes::ByteBuf,
    pub hash_tree: serde_bytes::ByteBuf,
    pub last_block_hash: serde_bytes::ByteBuf,
}

#[derive(CandidType, Deserialize)]
pub struct SupportedStandards1Item {
    pub url: String,
    pub name: String,
}

pub type SupportedStandards1 = Vec<SupportedStandards1Item>;
pub type Subaccount1 = serde_bytes::ByteBuf;
#[derive(CandidType, Deserialize)]
pub struct Account3 {
    pub owner: Principal,
    pub subaccount: Option<Subaccount1>,
}

#[derive(CandidType, Deserialize)]
pub struct ApprovalInfo {
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub expires_at: Option<u64>,
    pub spender: Account3,
}

#[derive(CandidType, Deserialize)]
pub struct ApproveCollectionArg {
    pub approval_info: ApprovalInfo,
}

#[derive(CandidType, Deserialize)]
pub enum ApproveCollectionError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    InvalidSpender,
    CreatedInFuture {
        ledger_time: u64,
    },
    GenericBatchError {
        message: String,
        error_code: candid::Nat,
    },
    TooOld,
}

#[derive(CandidType, Deserialize)]
pub enum ApproveCollectionResult {
    Ok(candid::Nat),
    Err(ApproveCollectionError),
}

#[derive(CandidType, Deserialize)]
pub struct ApproveTokenArg {
    pub token_id: candid::Nat,
    pub approval_info: ApprovalInfo,
}

#[derive(CandidType, Deserialize)]
pub enum ApproveTokenError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    InvalidSpender,
    NonExistingTokenId,
    Unauthorized,
    CreatedInFuture {
        ledger_time: u64,
    },
    GenericBatchError {
        message: String,
        error_code: candid::Nat,
    },
    TooOld,
}

#[derive(CandidType, Deserialize)]
pub enum ApproveTokenResult {
    Ok(candid::Nat),
    Err(ApproveTokenError),
}

#[derive(CandidType, Deserialize)]
pub struct CollectionApproval {
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub expires_at: Option<u64>,
    pub spender: Account3,
}

#[derive(CandidType, Deserialize)]
pub struct TokenApproval {
    pub token_id: candid::Nat,
    pub approval_info: ApprovalInfo,
}

#[derive(CandidType, Deserialize)]
pub struct IsApprovedArg {
    pub token_id: candid::Nat,
    pub from_subaccount: Option<serde_bytes::ByteBuf>,
    pub spender: Account3,
}

#[derive(CandidType, Deserialize)]
pub struct RevokeCollectionApprovalArg {
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub spender: Option<Account3>,
}

#[derive(CandidType, Deserialize)]
pub enum RevokeCollectionApprovalError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    Unauthorized,
    CreatedInFuture {
        ledger_time: u64,
    },
    ApprovalDoesNotExist,
    GenericBatchError {
        message: String,
        error_code: candid::Nat,
    },
    TooOld,
}

#[derive(CandidType, Deserialize)]
pub enum RevokeCollectionApprovalResult {
    Ok(candid::Nat),
    Err(RevokeCollectionApprovalError),
}

#[derive(CandidType, Deserialize)]
pub struct RevokeTokenApprovalArg {
    pub token_id: candid::Nat,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
    pub spender: Option<Account3>,
}

#[derive(CandidType, Deserialize)]
pub enum RevokeTokenApprovalError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    NonExistingTokenId,
    Unauthorized,
    CreatedInFuture {
        ledger_time: u64,
    },
    ApprovalDoesNotExist,
    GenericBatchError {
        message: String,
        error_code: candid::Nat,
    },
    TooOld,
}

#[derive(CandidType, Deserialize)]
pub enum RevokeTokenApprovalResult {
    Ok(candid::Nat),
    Err(RevokeTokenApprovalError),
}

#[derive(CandidType, Deserialize)]
pub struct TransferFromArg {
    pub to: Account3,
    pub spender_subaccount: Option<serde_bytes::ByteBuf>,
    pub token_id: candid::Nat,
    pub from: Account3,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub enum TransferFromError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    NonExistingTokenId,
    Unauthorized,
    CreatedInFuture {
        ledger_time: u64,
    },
    InvalidRecipient,
    GenericBatchError {
        message: String,
        error_code: candid::Nat,
    },
    TooOld,
}

#[derive(CandidType, Deserialize)]
pub enum TransferFromResult {
    Ok(candid::Nat),
    Err(TransferFromError),
}

#[derive(CandidType, Deserialize)]
pub struct GetArchivesArgs {
    pub from: Option<Principal>,
}

#[derive(CandidType, Deserialize)]
pub struct GetArchivesResultItem {
    pub end: candid::Nat,
    pub canister_id: Principal,
    pub start: candid::Nat,
}

pub type GetArchivesResult = Vec<GetArchivesResultItem>;
#[derive(CandidType, Deserialize)]
pub struct TransactionRange {
    pub start: candid::Nat,
    pub length: candid::Nat,
}

#[derive(CandidType, Deserialize)]
pub enum Value2 {
    Int(candid::Int),
    Map(Vec<(String, Box<Value2>)>),
    Nat(candid::Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(Vec<Box<Value2>>),
}

#[derive(CandidType, Deserialize)]
pub struct GetTransactionsResultBlocksItem {
    pub id: candid::Nat,
    pub block: Box<Value2>,
}

#[derive(CandidType, Deserialize)]
pub struct TransactionRange1 {
    pub start: candid::Nat,
    pub length: candid::Nat,
}

#[derive(CandidType, Deserialize)]
pub struct GetTransactionsResult1BlocksItem {
    pub id: candid::Nat,
    pub block: Box<Value2>,
}

#[derive(CandidType, Deserialize)]
pub struct GetTransactionsResult1 {
    pub log_length: candid::Nat,
    pub blocks: Vec<GetTransactionsResult1BlocksItem>,
    pub archived_blocks: Vec<Box<ArchivedTransactionResponse>>,
}

candid::define_function!(pub GetTransactionsFn : (Vec<TransactionRange1>) -> (
    GetTransactionsResult1,
  ) query);
#[derive(CandidType, Deserialize)]
pub struct ArchivedTransactionResponse {
    pub args: Vec<TransactionRange1>,
    pub callback: GetTransactionsFn,
}

#[derive(CandidType, Deserialize)]
pub struct GetTransactionsResult {
    pub log_length: candid::Nat,
    pub blocks: Vec<GetTransactionsResultBlocksItem>,
    pub archived_blocks: Vec<Box<ArchivedTransactionResponse>>,
}

#[derive(CandidType, Deserialize)]
pub struct DataCertificate {
    pub certificate: serde_bytes::ByteBuf,
    pub hash_tree: serde_bytes::ByteBuf,
}

#[derive(CandidType, Deserialize)]
pub struct BlockType1 {
    pub url: String,
    pub block_type: String,
}

#[derive(CandidType, Deserialize)]
pub struct Account1 {
    pub owner: Principal,
    pub subaccount: Option<serde_bytes::ByteBuf>,
}

pub type BalanceOfRequest = Vec<Account1>;
pub type BalanceOfResponse = Vec<candid::Nat>;
#[derive(CandidType, Deserialize)]
pub enum Value1 {
    Int(candid::Int),
    Map(Vec<(String, Box<Value1>)>),
    Nat(candid::Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(Vec<Box<Value1>>),
}

#[derive(CandidType, Deserialize)]
pub enum Value {
    Int(candid::Int),
    Map(Vec<(String, Box<Value1>)>),
    Nat(candid::Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(Vec<Box<Value1>>),
}

pub type OwnerOfRequest = Vec<candid::Nat>;
pub type OwnerOfResponse = Vec<Option<Account1>>;
#[derive(CandidType, Deserialize)]
pub struct TransferArgs {
    pub to: Account1,
    pub token_id: candid::Nat,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub enum TransferError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    NonExistingTokenId,
    Unauthorized,
    CreatedInFuture {
        ledger_time: u64,
    },
    InvalidRecipient,
    GenericBatchError {
        message: String,
        error_code: candid::Nat,
    },
    TooOld,
}

#[derive(CandidType, Deserialize)]
pub enum TransferResult {
    Ok(candid::Nat),
    Err(TransferError),
}

#[derive(CandidType, Deserialize)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Subaccount>,
}

#[derive(CandidType, Deserialize)]
pub struct PropertyShared {
    pub value: Box<CandyShared>,
    pub name: String,
    pub immutable: bool,
}

#[derive(CandidType, Deserialize)]
pub enum CandyShared {
    Int(candid::Int),
    Map(Vec<(String, Box<CandyShared>)>),
    Nat(candid::Nat),
    Set(Vec<Box<CandyShared>>),
    Nat16(u16),
    Nat32(u32),
    Nat64(u64),
    Blob(serde_bytes::ByteBuf),
    Bool(bool),
    Int8(i8),
    Ints(Vec<candid::Int>),
    Nat8(u8),
    Nats(Vec<candid::Nat>),
    Text(String),
    Bytes(serde_bytes::ByteBuf),
    Int16(i16),
    Int32(i32),
    Int64(i64),
    Option(Option<Box<CandyShared>>),
    Floats(Vec<f64>),
    Float(f64),
    #[serde(rename = "Principal")]
    Principal_(Principal),
    Array(Vec<Box<CandyShared>>),
    ValueMap(Vec<(Box<CandyShared>, Box<CandyShared>)>),
    Class(Vec<PropertyShared>),
}

#[derive(CandidType, Deserialize)]
pub enum NftInput {
    Int(candid::Int),
    Map(Vec<(String, Box<CandyShared>)>),
    Nat(candid::Nat),
    Set(Vec<Box<CandyShared>>),
    Nat16(u16),
    Nat32(u32),
    Nat64(u64),
    Blob(serde_bytes::ByteBuf),
    Bool(bool),
    Int8(i8),
    Ints(Vec<candid::Int>),
    Nat8(u8),
    Nats(Vec<candid::Nat>),
    Text(String),
    Bytes(serde_bytes::ByteBuf),
    Int16(i16),
    Int32(i32),
    Int64(i64),
    Option(Option<Box<CandyShared>>),
    Floats(Vec<f64>),
    Float(f64),
    #[serde(rename = "Principal")]
    Principal_(Principal),
    Array(Vec<Box<CandyShared>>),
    ValueMap(Vec<(Box<CandyShared>, Box<CandyShared>)>),
    Class(Vec<PropertyShared>),
}

#[derive(CandidType, Deserialize)]
pub struct SetNftItemRequest {
    pub token_id: candid::Nat,
    pub owner: Option<Account>,
    pub metadata: NftInput,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub r#override: bool,
    pub created_at_time: Option<u64>,
}

pub type SetNftRequest = Vec<SetNftItemRequest>;
#[derive(CandidType, Deserialize)]
pub enum SetNftError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TokenExists,
    NonExistingTokenId,
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
}

#[derive(CandidType, Deserialize)]
pub enum SetNftResult {
    Ok(Option<candid::Nat>),
    Err(SetNftError),
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
}

pub struct Service(pub Principal);
impl Service {
    pub async fn assign(&self, arg0: candid::Nat, arg1: Account2) -> Result<(candid::Nat,)> {
        ic_cdk::call(self.0, "assign", (arg0, arg1)).await
    }
    pub async fn burn(&self, arg0: BurnNftRequest) -> Result<(BurnNftBatchResponse,)> {
        ic_cdk::call(self.0, "burn", (arg0,)).await
    }
    pub async fn get_tip(&self) -> Result<(Tip,)> {
        ic_cdk::call(self.0, "get_tip", ()).await
    }
    pub async fn icrc_10_supported_standards(&self) -> Result<(SupportedStandards1,)> {
        ic_cdk::call(self.0, "icrc10_supported_standards", ()).await
    }
    pub async fn icrc_37_approve_collection(
        &self,
        arg0: Vec<ApproveCollectionArg>,
    ) -> Result<(Vec<Option<ApproveCollectionResult>>,)> {
        ic_cdk::call(self.0, "icrc37_approve_collection", (arg0,)).await
    }
    pub async fn icrc_37_approve_tokens(
        &self,
        arg0: Vec<ApproveTokenArg>,
    ) -> Result<(Vec<Option<ApproveTokenResult>>,)> {
        ic_cdk::call(self.0, "icrc37_approve_tokens", (arg0,)).await
    }
    pub async fn icrc_37_get_collection_approvals(
        &self,
        arg0: Account2,
        arg1: Option<CollectionApproval>,
        arg2: Option<candid::Nat>,
    ) -> Result<(Vec<CollectionApproval>,)> {
        ic_cdk::call(
            self.0,
            "icrc37_get_collection_approvals",
            (arg0, arg1, arg2),
        )
        .await
    }
    pub async fn icrc_37_get_token_approvals(
        &self,
        arg0: Vec<candid::Nat>,
        arg1: Option<TokenApproval>,
        arg2: Option<candid::Nat>,
    ) -> Result<(Vec<TokenApproval>,)> {
        ic_cdk::call(self.0, "icrc37_get_token_approvals", (arg0, arg1, arg2)).await
    }
    pub async fn icrc_37_is_approved(&self, arg0: Vec<IsApprovedArg>) -> Result<(Vec<bool>,)> {
        ic_cdk::call(self.0, "icrc37_is_approved", (arg0,)).await
    }
    pub async fn icrc_37_max_approvals_per_token_or_collection(
        &self,
    ) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc37_max_approvals_per_token_or_collection", ()).await
    }
    pub async fn icrc_37_max_revoke_approvals(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc37_max_revoke_approvals", ()).await
    }
    pub async fn icrc_37_revoke_collection_approvals(
        &self,
        arg0: Vec<RevokeCollectionApprovalArg>,
    ) -> Result<(Vec<Option<RevokeCollectionApprovalResult>>,)> {
        ic_cdk::call(self.0, "icrc37_revoke_collection_approvals", (arg0,)).await
    }
    pub async fn icrc_37_revoke_token_approvals(
        &self,
        arg0: Vec<RevokeTokenApprovalArg>,
    ) -> Result<(Vec<Option<RevokeTokenApprovalResult>>,)> {
        ic_cdk::call(self.0, "icrc37_revoke_token_approvals", (arg0,)).await
    }
    pub async fn icrc_37_transfer_from(
        &self,
        arg0: Vec<TransferFromArg>,
    ) -> Result<(Vec<Option<TransferFromResult>>,)> {
        ic_cdk::call(self.0, "icrc37_transfer_from", (arg0,)).await
    }
    pub async fn icrc_3_get_archives(&self, arg0: GetArchivesArgs) -> Result<(GetArchivesResult,)> {
        ic_cdk::call(self.0, "icrc3_get_archives", (arg0,)).await
    }
    pub async fn icrc_3_get_blocks(
        &self,
        arg0: Vec<TransactionRange>,
    ) -> Result<(GetTransactionsResult,)> {
        ic_cdk::call(self.0, "icrc3_get_blocks", (arg0,)).await
    }
    pub async fn icrc_3_get_tip_certificate(&self) -> Result<(Option<DataCertificate>,)> {
        ic_cdk::call(self.0, "icrc3_get_tip_certificate", ()).await
    }
    pub async fn icrc_3_supported_block_types(&self) -> Result<(Vec<BlockType1>,)> {
        ic_cdk::call(self.0, "icrc3_supported_block_types", ()).await
    }
    pub async fn icrc_7_atomic_batch_transfers(&self) -> Result<(Option<bool>,)> {
        ic_cdk::call(self.0, "icrc7_atomic_batch_transfers", ()).await
    }
    pub async fn icrc_7_balance_of(&self, arg0: BalanceOfRequest) -> Result<(BalanceOfResponse,)> {
        ic_cdk::call(self.0, "icrc7_balance_of", (arg0,)).await
    }
    pub async fn icrc_7_collection_metadata(&self) -> Result<(Vec<(String, Value)>,)> {
        ic_cdk::call(self.0, "icrc7_collection_metadata", ()).await
    }
    pub async fn icrc_7_default_take_value(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_default_take_value", ()).await
    }
    pub async fn icrc_7_description(&self) -> Result<(Option<String>,)> {
        ic_cdk::call(self.0, "icrc7_description", ()).await
    }
    pub async fn icrc_7_logo(&self) -> Result<(Option<String>,)> {
        ic_cdk::call(self.0, "icrc7_logo", ()).await
    }
    pub async fn icrc_7_max_memo_size(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_max_memo_size", ()).await
    }
    pub async fn icrc_7_max_query_batch_size(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_max_query_batch_size", ()).await
    }
    pub async fn icrc_7_max_take_value(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_max_take_value", ()).await
    }
    pub async fn icrc_7_max_update_batch_size(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_max_update_batch_size", ()).await
    }
    pub async fn icrc_7_name(&self) -> Result<(String,)> {
        ic_cdk::call(self.0, "icrc7_name", ()).await
    }
    pub async fn icrc_7_owner_of(&self, arg0: OwnerOfRequest) -> Result<(OwnerOfResponse,)> {
        ic_cdk::call(self.0, "icrc7_owner_of", (arg0,)).await
    }
    pub async fn icrc_7_permitted_drift(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_permitted_drift", ()).await
    }
    pub async fn icrc_7_supply_cap(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_supply_cap", ()).await
    }
    pub async fn icrc_7_symbol(&self) -> Result<(String,)> {
        ic_cdk::call(self.0, "icrc7_symbol", ()).await
    }
    pub async fn icrc_7_token_metadata(
        &self,
        arg0: Vec<candid::Nat>,
    ) -> Result<(Vec<Option<Vec<(String, Value)>>>,)> {
        ic_cdk::call(self.0, "icrc7_token_metadata", (arg0,)).await
    }
    pub async fn icrc_7_tokens(
        &self,
        arg0: Option<candid::Nat>,
        arg1: Option<candid::Nat>,
    ) -> Result<(Vec<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_tokens", (arg0, arg1)).await
    }
    pub async fn icrc_7_tokens_of(
        &self,
        arg0: Account2,
        arg1: Option<candid::Nat>,
        arg2: Option<candid::Nat>,
    ) -> Result<(Vec<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_tokens_of", (arg0, arg1, arg2)).await
    }
    pub async fn icrc_7_total_supply(&self) -> Result<(candid::Nat,)> {
        ic_cdk::call(self.0, "icrc7_total_supply", ()).await
    }
    pub async fn icrc_7_transfer(
        &self,
        arg0: Vec<TransferArgs>,
    ) -> Result<(Vec<Option<TransferResult>>,)> {
        ic_cdk::call(self.0, "icrc7_transfer", (arg0,)).await
    }
    pub async fn icrc_7_tx_window(&self) -> Result<(Option<candid::Nat>,)> {
        ic_cdk::call(self.0, "icrc7_tx_window", ()).await
    }
    pub async fn init(&self) -> Result<()> {
        ic_cdk::call(self.0, "init", ()).await
    }
    pub async fn mint(&self, arg0: SetNftRequest) -> Result<(Vec<SetNftResult>,)> {
        ic_cdk::call(self.0, "mint", (arg0,)).await
    }
}
