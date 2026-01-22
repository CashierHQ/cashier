// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::bitcoin::bridge_transaction::{
    BlockConfirmation, BridgeAssetInfo, BridgeTransaction, BridgeTransactionStatus, BridgeType,
};
use candid::{CandidType, Nat, Principal};
use serde::{Deserialize, Serialize};

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CreateBridgeTransactionInputArg {
    pub btc_txid: Option<String>,
    pub icp_address: Principal,
    pub btc_address: String,
    pub asset_infos: Vec<BridgeAssetInfo>,
    pub bridge_type: BridgeType,
    pub deposit_fee: Option<Nat>,
    pub withdrawal_fee: Option<Nat>,
    pub created_at_ts: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UpdateBridgeTransactionInputArg {
    pub bridge_id: String,
    pub btc_txid: Option<String>,
    pub block_id: Option<u64>,
    pub block_timestamp: Option<u64>,
    pub block_confirmations: Option<Vec<BlockConfirmation>>,
    pub deposit_fee: Option<Nat>,
    pub withdrawal_fee: Option<Nat>,
    pub status: Option<BridgeTransactionStatus>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct GetUserBridgeTransactionsInputArg {
    pub start: Option<u32>,
    pub limit: Option<u32>,
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
    pub block_id: Option<u64>,
    pub block_timestamp: Option<u64>,
    pub block_confirmations: Vec<BlockConfirmation>,
    pub deposit_fee: Option<Nat>,
    pub withdrawal_fee: Option<Nat>,
    pub created_at_ts: u64,
    pub total_amount: Option<Nat>,
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
            block_timestamp: tx.block_timestamp,
            block_confirmations: tx.block_confirmations,
            deposit_fee: tx.deposit_fee,
            withdrawal_fee: tx.withdrawal_fee,
            created_at_ts: tx.created_at_ts,
            total_amount: tx.total_amount,
            status: tx.status,
        }
    }
}
