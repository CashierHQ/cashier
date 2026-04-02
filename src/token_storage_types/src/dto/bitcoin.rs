// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::bitcoin::bridge_transaction::{
    BlockConfirmation, BridgeAssetInfo, BridgeTransaction, BridgeTransactionStatus, BridgeType,
    UTXO,
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
    pub btc_fee: Option<Nat>,
    pub created_at_ts: u64,
    /// ckBTC ledger block index of the mint transaction.
    /// Used by the manual refresh flow when no btc_txid is available.
    pub ckbtc_block_id: Option<u64>,
    /// Override the initial bridge status. If None, the default status for the
    /// bridge type is used (Import → Pending, Export → Created).
    pub status: Option<BridgeTransactionStatus>,
    /// Input UTXOs of the Bitcoin transaction used for bridging.
    pub vin: Option<Vec<UTXO>>,
    /// Output UTXOs of the Bitcoin transaction used for bridging.
    pub vout: Option<Vec<UTXO>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UpdateBridgeTransactionInputArg {
    pub bridge_id: String,
    pub btc_txid: Option<String>,
    pub ckbtc_block_id: Option<u64>,
    pub block_id: Option<u64>,
    pub block_timestamp: Option<u64>,
    pub block_confirmations: Option<Vec<BlockConfirmation>>,
    pub deposit_fee: Option<Nat>,
    pub withdrawal_fee: Option<Nat>,
    pub btc_fee: Option<Nat>,
    pub retry_times: Option<u8>,
    pub status: Option<BridgeTransactionStatus>,
    /// Omnity platform ticket id for Runes bridging.
    pub omnity_ticket_id: Option<String>,
    /// Input UTXOs of the Bitcoin transaction used for bridging.
    pub vin: Option<Vec<UTXO>>,
    /// Output UTXOs of the Bitcoin transaction used for bridging.
    pub vout: Option<Vec<UTXO>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct GetUserBridgeTransactionsInputArg {
    pub start: Option<u32>,
    pub limit: Option<u32>,
    pub status: Option<BridgeTransactionStatus>,
    pub bridge_type: Option<BridgeType>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserBridgeTransactionDto {
    pub bridge_id: String,
    pub icp_address: Principal,
    pub btc_address: String,
    pub bridge_type: BridgeType,
    pub asset_infos: Vec<BridgeAssetInfo>,
    pub btc_txid: Option<String>,
    pub ckbtc_block_id: Option<u64>,
    pub block_id: Option<u64>,
    pub block_timestamp: Option<u64>,
    pub block_confirmations: Vec<BlockConfirmation>,
    pub deposit_fee: Option<Nat>,
    pub withdrawal_fee: Option<Nat>,
    pub btc_fee: Option<Nat>,
    pub created_at_ts: u64,
    pub total_amount: Option<Nat>,
    pub retry_times: u8,
    pub status: BridgeTransactionStatus,
    pub omnity_ticket_id: Option<String>,
    pub vin: Option<Vec<UTXO>>,
    pub vout: Option<Vec<UTXO>>,
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
            ckbtc_block_id: tx.ckbtc_block_id,
            block_id: tx.block_id,
            block_timestamp: tx.block_timestamp,
            block_confirmations: tx.block_confirmations,
            deposit_fee: tx.deposit_fee,
            withdrawal_fee: tx.withdrawal_fee,
            btc_fee: tx.btc_fee,
            created_at_ts: tx.created_at_ts,
            total_amount: tx.total_amount,
            retry_times: tx.retry_times,
            status: tx.status,
            omnity_ticket_id: tx.omnity_ticket_id,
            vin: tx.vin,
            vout: tx.vout,
        }
    }
}
