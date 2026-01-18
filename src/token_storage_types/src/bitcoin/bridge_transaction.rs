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

impl BridgeTransaction {
    pub fn update(&mut self, input: UpdateBridgeTransactionInputArg) {
        if let Some(btc_txid) = input.btc_txid {
            self.btc_txid = Some(btc_txid);
        }
        if let Some(block_id) = input.block_id {
            self.block_id = Some(block_id);
        }
        if let Some(number_confirmations) = input.number_confirmations {
            self.number_confirmations = number_confirmations;
        }
        if let Some(minted_block) = input.minted_block {
            self.minted_block = Some(minted_block);
        }
        if let Some(minted_block_timestamp) = input.minted_block_timestamp {
            self.minted_block_timestamp = Some(minted_block_timestamp);
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
            number_confirmations: 0,
            minted_block: None,
            minted_block_timestamp: None,
            minter_fee: None,
            btc_fee: None,
            status: BridgeTransactionStatus::Created,
        };

        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: "test_bridge_id".to_string(),
            btc_txid: Some("new_btc_txid".to_string()),
            block_id: Some(Nat::from(100u32)),
            number_confirmations: Some(6),
            minted_block: Some(200),
            minted_block_timestamp: Some(Nat::from(1620000000u32)),
            minter_fee: Some(Nat::from(1000u32)),
            btc_fee: Some(Nat::from(500u32)),
            status: Some(BridgeTransactionStatus::Completed),
        };

        // Act
        transaction.update(update_input);

        // Assert
        assert_eq!(transaction.btc_txid, Some("new_btc_txid".to_string()));
        assert_eq!(transaction.block_id, Some(Nat::from(100u32)));
        assert_eq!(transaction.number_confirmations, 6);
        assert_eq!(transaction.minted_block, Some(200));
        assert_eq!(
            transaction.minted_block_timestamp,
            Some(Nat::from(1620000000u32))
        );
        assert_eq!(transaction.minter_fee, Some(Nat::from(1000u32)));
        assert_eq!(transaction.btc_fee, Some(Nat::from(500u32)));
        assert_eq!(transaction.status, BridgeTransactionStatus::Completed);
    }
}
