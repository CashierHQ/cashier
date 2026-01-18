// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::bitcoin::bridge_transaction::{
    BridgeAssetInfo, BridgeTransaction, BridgeTransactionStatus, BridgeType,
};
use candid::{CandidType, Nat, Principal};
use serde::{Deserialize, Serialize};

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CreateBridgeTransactionInputArg {
    pub icp_address: Principal,
    pub btc_address: String,
    pub asset_infos: Vec<BridgeAssetInfo>,
    pub bridge_type: BridgeType,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UpdateBridgeTransactionInputArg {
    pub bridge_id: String,
    pub btc_txid: Option<String>,
    pub block_id: Option<Nat>,
    pub number_confirmations: Option<u32>,
    pub minted_block: Option<u32>,
    pub minted_block_timestamp: Option<Nat>,
    pub minter_fee: Option<Nat>,
    pub btc_fee: Option<Nat>,
    pub status: Option<BridgeTransactionStatus>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserBridgeTransactionDto {
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

impl From<BridgeTransaction> for UserBridgeTransactionDto {
    fn from(tx: BridgeTransaction) -> Self {
        UserBridgeTransactionDto {
            bridge_id: tx.bridge_id,
            icp_address: tx.icp_address,
            btc_address: tx.btc_address,
            bridge_type: tx.bridge_type,
            asset_infos: tx.asset_infos,
            btc_txid: tx.btc_txid,
            block_id: tx.block_id,
            number_confirmations: tx.number_confirmations,
            minted_block: tx.minted_block,
            minted_block_timestamp: tx.minted_block_timestamp,
            minter_fee: tx.minter_fee,
            btc_fee: tx.btc_fee,
            status: tx.status,
        }
    }
}
