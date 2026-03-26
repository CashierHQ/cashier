// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;

use crate::dto::bitcoin::UpdateBridgeTransactionInputArg;

#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeTransaction {
    pub bridge_id: String,
    pub icp_address: Principal,
    pub btc_address: String,
    pub bridge_type: BridgeType,
    pub asset_infos: Vec<BridgeAssetInfo>,
    pub btc_txid: Option<String>,
    #[serde(default)]
    pub ckbtc_block_id: Option<u64>,
    pub block_id: Option<u64>,
    pub block_timestamp: Option<u64>,
    pub block_confirmations: Vec<BlockConfirmation>,
    pub deposit_fee: Option<Nat>,
    pub withdrawal_fee: Option<Nat>,
    #[serde(default)]
    pub btc_fee: Option<Nat>,
    pub created_at_ts: u64,
    pub total_amount: Option<Nat>,
    pub retry_times: u8,
    pub status: BridgeTransactionStatus,
}

impl BridgeTransaction {
    pub fn update(&mut self, input: UpdateBridgeTransactionInputArg) {
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

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use ic_stable_structures::Storable;
    use std::borrow::Cow;

    /// Represents the BridgeTransaction struct layout BEFORE commit 23265251 (Exporting BTC).
    /// Missing fields: `ckbtc_block_id` and `btc_fee`.
    /// Used to simulate old data already serialized in stable memory.
    #[derive(serde::Serialize, serde::Deserialize, Debug)]
    struct OldBridgeTransaction {
        pub bridge_id: String,
        pub icp_address: Principal,
        pub btc_address: String,
        pub bridge_type: BridgeType,
        pub asset_infos: Vec<BridgeAssetInfo>,
        pub btc_txid: Option<String>,
        // NO ckbtc_block_id field — this is what was added later
        pub block_id: Option<u64>,
        pub block_timestamp: Option<u64>,
        pub block_confirmations: Vec<BlockConfirmation>,
        pub deposit_fee: Option<Nat>,
        pub withdrawal_fee: Option<Nat>,
        // NO btc_fee field — this is what was added later
        pub created_at_ts: u64,
        pub total_amount: Option<Nat>,
        pub retry_times: u8,
        pub status: BridgeTransactionStatus,
    }

    /// EXAMPLE: What happens WITHOUT #[serde(default)] on new fields.
    /// Demonstrates that adding fields to a #[storable] (CBOR) struct without #[serde(default)]
    /// causes deserialization panic when reading old data from stable memory.
    /// This was the root cause of the "flushed data" incident after commit 23265251.
    #[derive(serde::Serialize, serde::Deserialize, Debug)]
    struct BridgeTransactionWithoutDefault {
        pub bridge_id: String,
        pub icp_address: Principal,
        pub btc_address: String,
        pub bridge_type: BridgeType,
        pub asset_infos: Vec<BridgeAssetInfo>,
        pub btc_txid: Option<String>,
        pub ckbtc_block_id: Option<u64>, // no #[serde(default)] → panics on old data
        pub block_id: Option<u64>,
        pub block_timestamp: Option<u64>,
        pub block_confirmations: Vec<BlockConfirmation>,
        pub deposit_fee: Option<Nat>,
        pub withdrawal_fee: Option<Nat>,
        pub btc_fee: Option<Nat>, // no #[serde(default)] → panics on old data
        pub created_at_ts: u64,
        pub total_amount: Option<Nat>,
        pub retry_times: u8,
        pub status: BridgeTransactionStatus,
    }

    /// Demonstrates that ciborium TOLERATES missing Option<T> fields in CBOR maps.
    /// This means adding new Option fields to a #[storable] struct does NOT cause panics
    /// on old data — ciborium defaults missing Option keys to None automatically.
    #[test]
    fn it_should_tolerate_missing_option_fields_in_cbor_without_serde_default() {
        let old_tx = OldBridgeTransaction {
            bridge_id: "bridge_001".to_string(),
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "bc1qtest".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            btc_txid: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            created_at_ts: 1700000000,
            total_amount: None,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
        };
        let mut cbor_bytes = Vec::new();
        ciborium::into_writer(&old_tx, &mut cbor_bytes).unwrap();

        // ciborium handles missing Option<T> fields gracefully — no #[serde(default)] needed
        let result: Result<BridgeTransactionWithoutDefault, _> =
            ciborium::from_reader(cbor_bytes.as_slice());
        assert!(result.is_ok(), "ciborium should tolerate missing Option fields");

        let tx = result.unwrap();
        assert_eq!(tx.ckbtc_block_id, None);
        assert_eq!(tx.btc_fee, None);
    }

    /// Proves that CBOR bytes from old struct layout (missing `ckbtc_block_id`, `btc_fee`)
    /// can be deserialized into current BridgeTransaction thanks to #[serde(default)].
    /// Missing fields default to None. This verifies the fix for the "flushed data" issue.
    #[test]
    fn it_should_deserialize_old_layout_with_missing_fields_as_none() {
        // Simulate old data: serialize with the old struct layout (no ckbtc_block_id, no btc_fee)
        let old_tx = OldBridgeTransaction {
            bridge_id: "bridge_001".to_string(),
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "bc1qtest".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            btc_txid: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            created_at_ts: 1700000000,
            total_amount: None,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
        };

        // Serialize to CBOR (simulates what was in stable memory before upgrade)
        let mut cbor_bytes = Vec::new();
        ciborium::into_writer(&old_tx, &mut cbor_bytes).unwrap();

        // With #[serde(default)] on the new fields, this now succeeds
        let tx = BridgeTransaction::from_bytes(Cow::Borrowed(&cbor_bytes));

        // Old fields preserved correctly
        assert_eq!(tx.bridge_id, "bridge_001");
        assert_eq!(tx.btc_address, "bc1qtest");
        assert_eq!(tx.created_at_ts, 1700000000);
        assert_eq!(tx.status, BridgeTransactionStatus::Created);
        // New fields default to None (not present in old CBOR bytes)
        assert_eq!(tx.ckbtc_block_id, None);
        assert_eq!(tx.btc_fee, None);
    }

    /// Proves that current-layout CBOR round-trips correctly (no regression for new data).
    #[test]
    fn it_should_roundtrip_current_layout_via_cbor() {
        let tx = BridgeTransaction {
            bridge_id: "bridge_002".to_string(),
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "bc1qtest2".to_string(),
            bridge_type: BridgeType::Export,
            asset_infos: vec![],
            btc_txid: Some("txid_abc".to_string()),
            ckbtc_block_id: Some(42),
            block_id: Some(100),
            block_timestamp: Some(1700000000),
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            btc_fee: Some(Nat::from(500u32)),
            created_at_ts: 1700000000,
            total_amount: None,
            retry_times: 0,
            status: BridgeTransactionStatus::Completed,
        };

        let bytes = tx.to_bytes();
        let restored = BridgeTransaction::from_bytes(bytes);

        assert_eq!(tx.bridge_id, restored.bridge_id);
        assert_eq!(tx.ckbtc_block_id, restored.ckbtc_block_id);
        assert_eq!(tx.btc_fee, restored.btc_fee);
        assert_eq!(tx.status, restored.status);
    }

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
        };

        // Act
        transaction.update(update_input);

        // Assert
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
