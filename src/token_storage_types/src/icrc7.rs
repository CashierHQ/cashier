// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Deserialize, Int, Nat, Principal};

pub type SubAccount = serde_bytes::ByteBuf;

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<SubAccount>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct NftMetadata {
    pub name: String,
    pub description: Option<String>,
    pub image: Option<String>,
}

pub type Icrc7OwnerOfResponse = Vec<Option<Account>>;

#[derive(CandidType, Deserialize)]
#[allow(clippy::large_enum_variant)]
pub enum CanisterLifecycleArgs {
    Init(InitArgs),
    Upgrade(UpgradeArgs),
}

#[derive(CandidType, Deserialize)]
pub struct InitArgs {
    pub permissions: PermissionManager,
    pub supply_cap: Option<Nat>,
    pub tx_window: Option<Nat>,
    pub test_mode: bool,
    pub default_take_value: Option<Nat>,
    pub max_canister_storage_threshold: Option<Nat>,
    pub logo: Option<String>,
    pub permitted_drift: Option<Nat>,
    pub name: String,
    pub description: Option<String>,
    pub version: BuildVersion,
    pub max_take_value: Option<Nat>,
    pub max_update_batch_size: Option<Nat>,
    pub max_query_batch_size: Option<Nat>,
    pub commit_hash: String,
    pub max_memo_size: Option<Nat>,
    pub atomic_batch_transfers: Option<bool>,
    pub collection_metadata: Vec<(String, CustomValue)>,
    pub symbol: String,
    pub approval_init: InitApprovalsArg,
}

#[derive(CandidType, Deserialize)]
pub struct PermissionManager {
    pub user_permissions: Vec<(Principal, Vec<Permission>)>,
}

#[derive(CandidType, Deserialize)]
pub enum Permission {
    UpdateMetadata,
    Minting,
    UpdateCollectionMetadata,
    UpdateUploads,
    ManageAuthorities,
    ReadUploads,
}

#[derive(CandidType, Deserialize)]
pub struct BuildVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

#[derive(CandidType, Deserialize)]
pub enum CustomValue {
    Int(Int),
    Map(Vec<(String, Box<Icrc3Value>)>),
    Nat(Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(Vec<Box<Icrc3Value>>),
}

#[derive(CandidType, Deserialize)]
pub enum Icrc3Value {
    Int(Int),
    Map(Vec<(String, Box<Icrc3Value>)>),
    Nat(Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(Vec<Box<Icrc3Value>>),
}

#[derive(CandidType, Deserialize)]
pub struct InitApprovalsArg {
    pub max_approvals_per_token_or_collection: Option<Nat>,
    pub max_revoke_approvals: Option<Nat>,
}

#[derive(CandidType, Deserialize)]
pub struct UpgradeArgs {
    pub version: BuildVersion,
    pub commit_hash: String,
}

#[derive(CandidType, Deserialize)]
pub struct MintArgs {
    pub mint_requests: Vec<MintRequest>,
}

#[derive(CandidType, Deserialize)]
pub struct MintRequest {
    pub metadata: Vec<(String, Box<Icrc3Value>)>,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub token_owner: Account,
}

pub type MintResult = Result<Nat, MintError>;

#[derive(CandidType, Deserialize, Debug)]
pub enum MintError {
    TokenAlreadyExists,
    StorageCanisterError(String),
    ExceedMaxAllowedSupplyCap,
    InvalidMemo,
    ConcurrentManagementCall,
}
