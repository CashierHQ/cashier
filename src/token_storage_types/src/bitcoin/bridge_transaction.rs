// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;
use uuid::Uuid;

use crate::{
    dto::bitcoin::{CreateBridgeTransactionInputArg, UpdateBridgeTransactionInputArg},
    error::CanisterError,
};

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
    pub deposit_fee: Option<Nat>,
    pub withdrawal_fee: Option<Nat>,
    pub created_at_ts: u64,
    pub total_amount: Option<Nat>,
    pub status: BridgeTransactionStatus,
}

pub struct BridgeTransactionMapper;

impl BridgeTransactionMapper {
    pub fn from_create_input(
        input: CreateBridgeTransactionInputArg,
    ) -> Result<BridgeTransaction, CanisterError> {
        let mut bridge_id = Uuid::new_v4().to_string();
        if input.bridge_type == BridgeType::Import {
            let btc_txid = input.btc_txid.ok_or_else(|| {
                CanisterError::ValidationErrors("btc_txid is required for import".to_string())
            })?;
            bridge_id = format!("import_{}", btc_txid);
        }
        let mut total_amount = Nat::from(0u32);
        for asset_info in &input.asset_infos {
            total_amount += asset_info.amount.clone();
        }

        Ok(BridgeTransaction {
            bridge_id,
            icp_address: input.icp_address,
            btc_address: input.btc_address,
            bridge_type: input.bridge_type,
            asset_infos: input.asset_infos,
            btc_txid: None,
            block_id: None,
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: None,
            total_amount: Some(total_amount),
            created_at_ts: input.created_at_ts,
            status: BridgeTransactionStatus::Created,
        })
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
        if let Some(deposit_fee) = input.deposit_fee {
            self.deposit_fee = Some(deposit_fee);
        }
        if let Some(withdrawal_fee) = input.withdrawal_fee {
            self.withdrawal_fee = Some(withdrawal_fee);
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

    #[test]
    fn it_shoulf_create_bridge_transaction_from_input() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_txid".to_string()),
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "test_btc_address".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
            created_at_ts: 0,
        };

        // Act
        let transaction: BridgeTransaction =
            BridgeTransactionMapper::from_create_input(input).unwrap();

        // Assert
        assert_eq!(
            transaction.icp_address,
            Principal::from_text("aaaaa-aa").unwrap()
        );
        assert_eq!(transaction.btc_address, "test_btc_address".to_string());
        assert_eq!(transaction.asset_infos.len(), 0);
        assert_eq!(transaction.bridge_type, BridgeType::Import);
        assert_eq!(transaction.btc_txid, Some("test_txid".to_string()));
        assert_eq!(transaction.block_id, None);
        assert_eq!(transaction.block_confirmations.len(), 0);
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
            deposit_fee: None,
            withdrawal_fee: None,
            total_amount: None,
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
            deposit_fee: Some(Nat::from(1000u32)),
            withdrawal_fee: Some(Nat::from(500u32)),
            status: Some(BridgeTransactionStatus::Completed),
        };

        // Act
        transaction.update(update_input);

        // Assert
        assert_eq!(transaction.btc_txid, Some("new_btc_txid".to_string()));
        assert_eq!(transaction.block_id, Some(Nat::from(100u32)));
        assert_eq!(transaction.block_confirmations.len(), 2);
        assert_eq!(transaction.deposit_fee, Some(Nat::from(1000u32)));
        assert_eq!(transaction.withdrawal_fee, Some(Nat::from(500u32)));
        assert_eq!(transaction.status, BridgeTransactionStatus::Completed);
    }
}
