// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeTransaction {
    pub bridge_id: String,
    pub imported_address: Principal,
    pub exported_address: String,
    pub bridge_type: BridgeType,
    pub asset_infos: Vec<BridgeAssetInfo>,
    pub amount_satoshi: u64,
    pub txid: String,
    pub block_id: Nat,
}

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub enum BridgeType {
    Import,
    Export,
}

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeAssetInfo {
    pub asset_type: BridgeAssetType,
    pub asset_id: String,
    pub ledger_id: Principal,
    pub amount: Nat,
    pub decimals: u8,
}

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub enum BridgeAssetType {
    BTC,
    Runes,
    Ordinals,
}
