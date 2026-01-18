// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;
use uuid::Uuid;

use crate::dto::bitcoin::CreateBridgeTransactionInputArg;

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeTransaction {
    pub bridge_id: String,
    pub icp_address: Principal,
    pub btc_address: String,
    pub bridge_type: BridgeType,
    pub asset_infos: Vec<BridgeAssetInfo>,
    pub btc_txid: Option<String>,
    pub block_id: Option<Nat>,
    pub number_confirmations: u32,
    pub minted_block: Option<u32>,
    pub minted_block_timestamp: Option<Nat>,
    pub minter_fee: Option<Nat>,
    pub btc_fee: Option<Nat>,
    pub status: BridgeTransactionStatus,
}

impl From<CreateBridgeTransactionInputArg> for BridgeTransaction {
    fn from(input: CreateBridgeTransactionInputArg) -> Self {
        BridgeTransaction {
            bridge_id: Uuid::new_v4().to_string(),
            icp_address: input.icp_address,
            btc_address: input.btc_address,
            bridge_type: input.bridge_type,
            asset_infos: input.asset_infos,
            btc_txid: None,
            block_id: None,
            number_confirmations: 0,
            minted_block: None,
            minted_block_timestamp: None,
            minter_fee: None,
            btc_fee: None,
            status: BridgeTransactionStatus::Created,
        }
    }
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

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub enum BridgeTransactionStatus {
    Created,
    Pending,
    Completed,
    Failed,
}

#[storable]
pub enum BridgeTransactionCodec {
    V1(Vec<BridgeTransaction>),
}

impl Codec<Vec<BridgeTransaction>> for BridgeTransactionCodec {
    fn decode(source: Self) -> Vec<BridgeTransaction> {
        match source {
            BridgeTransactionCodec::V1(tx) => tx,
        }
    }

    fn encode(dest: Vec<BridgeTransaction>) -> Self {
        BridgeTransactionCodec::V1(dest)
    }
}
