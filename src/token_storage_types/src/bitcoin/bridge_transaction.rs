// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;

use crate::dto::bitcoin::UpdateBridgeTransactionInputArg;

/// A Bitcoin UTXO (Unspent Transaction Output) reference.
#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct UTXO {
    pub txid: String,
    pub vout: u32,
}

/// V1 snapshot of BridgeTransaction (before omnity_ticket_id / vin / vout fields).
#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeTransactionV1 {
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
}

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeTransaction {
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
    /// Omnity platform ticket id for Runes bridging.
    pub omnity_ticket_id: Option<String>,
    /// Input UTXOs of the Bitcoin transaction used for bridging.
    pub vin: Option<Vec<UTXO>>,
    /// Output UTXOs of the Bitcoin transaction used for bridging.
    pub vout: Option<Vec<UTXO>>,
}

impl BridgeTransaction {
    pub fn update(&mut self, input: UpdateBridgeTransactionInputArg) {
        if let Some(asset_infos) = input.asset_infos {
            let mut total_amount = Nat::from(0u32);
            for asset_info in &asset_infos {
                total_amount += asset_info.amount.clone();
            }

            self.asset_infos = asset_infos;
            self.total_amount = Some(total_amount);
        }
        if let Some(btc_txid) = input.btc_txid {
            self.btc_txid = Some(btc_txid);
        }
        if let Some(ckbtc_block_id) = input.ckbtc_block_id {
            self.ckbtc_block_id = Some(ckbtc_block_id);
        }
        if let Some(block_id) = input.block_id {
            self.block_id = Some(block_id);
        }
        if let Some(block_timestamp) = input.block_timestamp {
            self.block_timestamp = Some(block_timestamp);
        }
        if let Some(block_confirmations) = input.block_confirmations {
            self.block_confirmations = block_confirmations;
        }
        if let Some(deposit_fee) = input.deposit_fee {
            self.deposit_fee = Some(deposit_fee);
        }
        if let Some(withdrawal_fee) = input.withdrawal_fee {
            self.withdrawal_fee = Some(withdrawal_fee);
        }
        if let Some(btc_fee) = input.btc_fee {
            self.btc_fee = Some(btc_fee);
        }
        if let Some(retry_times) = input.retry_times {
            self.retry_times = retry_times;
        }
        if let Some(status) = input.status {
            self.status = status;
        }
        if let Some(omnity_ticket_id) = input.omnity_ticket_id {
            self.omnity_ticket_id = Some(omnity_ticket_id);
        }
        if let Some(vin) = input.vin {
            self.vin = Some(vin);
        }
        if let Some(vout) = input.vout {
            self.vout = Some(vout);
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
    Confirmed,
    Completed,
    Failed,
}

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BlockConfirmation {
    pub block_id: u64,
    pub block_timestamp: u64,
}

#[storable]
pub enum BridgeTransactionCodec {
    V1(Vec<BridgeTransactionV1>),
    V2(Vec<BridgeTransaction>),
}

impl Codec<Vec<BridgeTransaction>> for BridgeTransactionCodec {
    fn decode(source: Self) -> Vec<BridgeTransaction> {
        match source {
            BridgeTransactionCodec::V1(txs) => txs
                .into_iter()
                .map(|tx| BridgeTransaction {
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
                    omnity_ticket_id: None,
                    vin: None,
                    vout: None,
                })
                .collect(),
            BridgeTransactionCodec::V2(txs) => txs,
        }
    }

    fn encode(dest: Vec<BridgeTransaction>) -> Self {
        BridgeTransactionCodec::V2(dest)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;

    #[test]
    fn it_should_update_bridge_transaction_fields() {
        // Arrange
        let mut transaction = BridgeTransaction {
            bridge_id: "test_bridge_id".to_string(),
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "test_btc_address".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: None,
            total_amount: None,
            created_at_ts: 0,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        let block_confirmations = vec![
            BlockConfirmation {
                block_id: 1,
                block_timestamp: 1620000000,
            },
            BlockConfirmation {
                block_id: 2,
                block_timestamp: 1620000600,
            },
        ];
        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: "test_bridge_id".to_string(),
            asset_infos: Some(vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::Runes,
                asset_id: "UNCOMMON•GOODS".to_string(),
                amount: Nat::from(1200u32),
                decimals: 8,
            }]),
            btc_txid: Some("new_btc_txid".to_string()),
            ckbtc_block_id: Some(99u64),
            block_id: Some(100u64),
            block_timestamp: Some(1620001200u64),
            block_confirmations: Some(block_confirmations),
            deposit_fee: Some(Nat::from(1000u32)),
            withdrawal_fee: Some(Nat::from(500u32)),
            btc_fee: Some(Nat::from(200u32)),
            retry_times: Some(1),
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        transaction.update(update_input);

        // Assert
        assert_eq!(transaction.asset_infos.len(), 1);
        assert_eq!(transaction.asset_infos[0].amount, Nat::from(1200u32));
        assert_eq!(transaction.total_amount, Some(Nat::from(1200u32)));
        assert_eq!(transaction.btc_txid, Some("new_btc_txid".to_string()));
        assert_eq!(transaction.ckbtc_block_id, Some(99u64));
        assert_eq!(transaction.block_id, Some(100u64));
        assert_eq!(transaction.block_timestamp, Some(1620001200u64));
        assert_eq!(transaction.block_confirmations.len(), 2);
        assert_eq!(transaction.deposit_fee, Some(Nat::from(1000u32)));
        assert_eq!(transaction.withdrawal_fee, Some(Nat::from(500u32)));
        assert_eq!(transaction.btc_fee, Some(Nat::from(200u32)));
        assert_eq!(transaction.retry_times, 1);
        assert_eq!(transaction.status, BridgeTransactionStatus::Completed);
    }
}
