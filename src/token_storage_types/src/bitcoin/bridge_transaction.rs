// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;
use uuid::Uuid;

use crate::dto::bitcoin::{CreateBridgeTransactionInputArg, UpdateBridgeTransactionInputArg};

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
    pub block_confirmations: Vec<BlockConfirmation>,
    pub minter_fee: Option<Nat>,
    pub btc_fee: Option<Nat>,
    pub created_at_ts: u64,
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
            block_confirmations: vec![],
            minter_fee: None,
            btc_fee: None,
            created_at_ts: 0,
            status: BridgeTransactionStatus::Created,
        }
    }
}

impl BridgeTransaction {
    pub fn update(&mut self, input: UpdateBridgeTransactionInputArg) {
        if let Some(btc_txid) = input.btc_txid {
            self.btc_txid = Some(btc_txid);
        }
        if let Some(block_id) = input.block_id {
            self.block_id = Some(block_id);
        }
        if let Some(block_confirmations) = input.block_confirmations {
            self.block_confirmations = block_confirmations;
        }
        if let Some(minter_fee) = input.minter_fee {
            self.minter_fee = Some(minter_fee);
        }
        if let Some(btc_fee) = input.btc_fee {
            self.btc_fee = Some(btc_fee);
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

    #[test]
    fn it_shoulf_create_bridge_transaction_from_input() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "test_btc_address".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
        };

        // Act
        let transaction: BridgeTransaction = input.into();

        // Assert
        assert_eq!(
            transaction.icp_address,
            Principal::from_text("aaaaa-aa").unwrap()
        );
        assert_eq!(transaction.btc_address, "test_btc_address".to_string());
        assert_eq!(transaction.asset_infos.len(), 0);
        assert_eq!(transaction.bridge_type, BridgeType::Import);
        assert_eq!(transaction.btc_txid, None);
        assert_eq!(transaction.block_id, None);
        assert_eq!(transaction.block_confirmations.len(), 0);
        assert_eq!(transaction.minter_fee, None);
        assert_eq!(transaction.btc_fee, None);
        assert_eq!(transaction.status, BridgeTransactionStatus::Created);
        assert_eq!(transaction.created_at_ts, 0);
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
            block_id: None,
            block_confirmations: vec![],
            minter_fee: None,
            btc_fee: None,
            created_at_ts: 0,
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
            block_id: Some(Nat::from(100u32)),
            block_confirmations: Some(block_confirmations),
            minter_fee: Some(Nat::from(1000u32)),
            btc_fee: Some(Nat::from(500u32)),
            status: Some(BridgeTransactionStatus::Completed),
        };

        // Act
        transaction.update(update_input);

        // Assert
        assert_eq!(transaction.btc_txid, Some("new_btc_txid".to_string()));
        assert_eq!(transaction.block_id, Some(Nat::from(100u32)));
        assert_eq!(transaction.block_confirmations.len(), 2);
        assert_eq!(transaction.minter_fee, Some(Nat::from(1000u32)));
        assert_eq!(transaction.btc_fee, Some(Nat::from(500u32)));
        assert_eq!(transaction.status, BridgeTransactionStatus::Completed);
    }
}
