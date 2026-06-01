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

/// Asset-type-specific fields for a bridge transaction, including denomination-explicit fee fields.
#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub enum BridgeDetails {
    CkBTC {
        ckbtc_block_id: Option<u64>,
        /// ckBTC mint deposit fee denominated in BTC satoshis.
        deposit_fee_btc_sats: Option<Nat>,
        /// ckBTC burn withdrawal fee denominated in BTC satoshis.
        withdrawal_fee_btc_sats: Option<Nat>,
    },
    Runes {
        omnity_ticket_id: Option<String>,
        /// Omnity ICP redeem fee denominated in ICP e8s.
        withdrawal_fee_icp_e8s: Option<Nat>,
    },
    /// Migration fallback for records that predate asset classification.
    Legacy,
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

/// V2 snapshot of BridgeTransaction (before BridgeDetails enum; had flat asset-specific fields).
#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeTransactionV2 {
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

/// V3 snapshot of BridgeTransaction (before fees were moved into BridgeDetails).
#[derive(Clone, Debug, CandidType, PartialEq, Eq, Hash)]
#[storable]
pub struct BridgeTransactionV3 {
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
    pub btc_fee: Option<Nat>,
    pub created_at_ts: u64,
    pub total_amount: Option<Nat>,
    pub retry_times: u8,
    pub status: BridgeTransactionStatus,
    pub vin: Option<Vec<UTXO>>,
    pub vout: Option<Vec<UTXO>>,
    pub details: BridgeDetails,
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
    pub block_id: Option<u64>,
    pub block_timestamp: Option<u64>,
    pub block_confirmations: Vec<BlockConfirmation>,
    /// Bitcoin network fee (miner fee), separate from minter/protocol fees stored in details.
    pub btc_fee: Option<Nat>,
    pub created_at_ts: u64,
    pub total_amount: Option<Nat>,
    pub retry_times: u8,
    pub status: BridgeTransactionStatus,
    /// Input UTXOs of the Bitcoin transaction used for bridging.
    pub vin: Option<Vec<UTXO>>,
    /// Output UTXOs of the Bitcoin transaction used for bridging.
    pub vout: Option<Vec<UTXO>>,
    /// Asset-type-specific fields including denomination-explicit fee amounts.
    pub details: BridgeDetails,
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
        if let Some(block_id) = input.block_id {
            self.block_id = Some(block_id);
        }
        if let Some(block_timestamp) = input.block_timestamp {
            self.block_timestamp = Some(block_timestamp);
        }
        if let Some(block_confirmations) = input.block_confirmations {
            self.block_confirmations = block_confirmations;
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
        if let Some(vin) = input.vin {
            self.vin = Some(vin);
        }
        if let Some(vout) = input.vout {
            self.vout = Some(vout);
        }

        match &mut self.details {
            BridgeDetails::CkBTC {
                ckbtc_block_id,
                deposit_fee_btc_sats,
                withdrawal_fee_btc_sats,
            } => {
                if let Some(id) = input.ckbtc_block_id {
                    *ckbtc_block_id = Some(id);
                }
                if let Some(f) = input.deposit_fee_btc_sats {
                    *deposit_fee_btc_sats = Some(f);
                }
                if let Some(f) = input.withdrawal_fee_btc_sats {
                    *withdrawal_fee_btc_sats = Some(f);
                }
            }
            BridgeDetails::Runes {
                omnity_ticket_id,
                withdrawal_fee_icp_e8s,
            } => {
                if let Some(t) = input.omnity_ticket_id {
                    *omnity_ticket_id = Some(t);
                }
                if let Some(f) = input.withdrawal_fee_icp_e8s {
                    *withdrawal_fee_icp_e8s = Some(f);
                }
            }
            BridgeDetails::Legacy => {
                if input.ckbtc_block_id.is_some() {
                    self.details = BridgeDetails::CkBTC {
                        ckbtc_block_id: input.ckbtc_block_id,
                        deposit_fee_btc_sats: input.deposit_fee_btc_sats,
                        withdrawal_fee_btc_sats: input.withdrawal_fee_btc_sats,
                    };
                } else if input.omnity_ticket_id.is_some() {
                    self.details = BridgeDetails::Runes {
                        omnity_ticket_id: input.omnity_ticket_id,
                        withdrawal_fee_icp_e8s: input.withdrawal_fee_icp_e8s,
                    };
                }
            }
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
    V2(Vec<BridgeTransactionV2>),
    V3(Vec<BridgeTransactionV3>),
    V4(Vec<BridgeTransaction>),
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
                    block_id: tx.block_id,
                    block_timestamp: tx.block_timestamp,
                    block_confirmations: tx.block_confirmations,
                    btc_fee: tx.btc_fee,
                    created_at_ts: tx.created_at_ts,
                    total_amount: tx.total_amount,
                    retry_times: tx.retry_times,
                    status: tx.status,
                    vin: None,
                    vout: None,
                    details: BridgeDetails::CkBTC {
                        ckbtc_block_id: tx.ckbtc_block_id,
                        deposit_fee_btc_sats: tx.deposit_fee,
                        withdrawal_fee_btc_sats: tx.withdrawal_fee,
                    },
                })
                .collect(),
            BridgeTransactionCodec::V2(txs) => txs
                .into_iter()
                .map(|tx| {
                    let is_runes = tx
                        .asset_infos
                        .iter()
                        .any(|a| matches!(a.asset_type, BridgeAssetType::Runes));
                    let details = if is_runes {
                        BridgeDetails::Runes {
                            omnity_ticket_id: tx.omnity_ticket_id,
                            withdrawal_fee_icp_e8s: tx.withdrawal_fee,
                        }
                    } else {
                        BridgeDetails::CkBTC {
                            ckbtc_block_id: tx.ckbtc_block_id,
                            deposit_fee_btc_sats: tx.deposit_fee,
                            withdrawal_fee_btc_sats: tx.withdrawal_fee,
                        }
                    };
                    BridgeTransaction {
                        bridge_id: tx.bridge_id,
                        icp_address: tx.icp_address,
                        btc_address: tx.btc_address,
                        bridge_type: tx.bridge_type,
                        asset_infos: tx.asset_infos,
                        btc_txid: tx.btc_txid,
                        block_id: tx.block_id,
                        block_timestamp: tx.block_timestamp,
                        block_confirmations: tx.block_confirmations,
                        btc_fee: tx.btc_fee,
                        created_at_ts: tx.created_at_ts,
                        total_amount: tx.total_amount,
                        retry_times: tx.retry_times,
                        status: tx.status,
                        vin: tx.vin,
                        vout: tx.vout,
                        details,
                    }
                })
                .collect(),
            BridgeTransactionCodec::V3(txs) => txs
                .into_iter()
                .map(|tx| {
                    let details = match tx.details {
                        BridgeDetails::CkBTC { ckbtc_block_id, .. } => BridgeDetails::CkBTC {
                            ckbtc_block_id,
                            deposit_fee_btc_sats: tx.deposit_fee,
                            withdrawal_fee_btc_sats: tx.withdrawal_fee,
                        },
                        BridgeDetails::Runes {
                            omnity_ticket_id, ..
                        } => BridgeDetails::Runes {
                            omnity_ticket_id,
                            withdrawal_fee_icp_e8s: tx.withdrawal_fee,
                        },
                        BridgeDetails::Legacy => BridgeDetails::Legacy,
                    };
                    BridgeTransaction {
                        bridge_id: tx.bridge_id,
                        icp_address: tx.icp_address,
                        btc_address: tx.btc_address,
                        bridge_type: tx.bridge_type,
                        asset_infos: tx.asset_infos,
                        btc_txid: tx.btc_txid,
                        block_id: tx.block_id,
                        block_timestamp: tx.block_timestamp,
                        block_confirmations: tx.block_confirmations,
                        btc_fee: tx.btc_fee,
                        created_at_ts: tx.created_at_ts,
                        total_amount: tx.total_amount,
                        retry_times: tx.retry_times,
                        status: tx.status,
                        vin: tx.vin,
                        vout: tx.vout,
                        details,
                    }
                })
                .collect(),
            BridgeTransactionCodec::V4(txs) => txs,
        }
    }

    fn encode(dest: Vec<BridgeTransaction>) -> Self {
        BridgeTransactionCodec::V4(dest)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;

    fn fixture_of_ckbtc_bridge_transaction() -> BridgeTransaction {
        BridgeTransaction {
            bridge_id: "test_bridge_id".to_string(),
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "test_btc_address".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            btc_txid: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            btc_fee: None,
            total_amount: None,
            created_at_ts: 0,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            vin: None,
            vout: None,
            details: BridgeDetails::CkBTC {
                ckbtc_block_id: None,
                deposit_fee_btc_sats: None,
                withdrawal_fee_btc_sats: None,
            },
        }
    }

    #[test]
    fn it_should_update_bridge_transaction_fields() {
        // Arrange
        let mut transaction = fixture_of_ckbtc_bridge_transaction();

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
            deposit_fee_btc_sats: Some(Nat::from(1000u32)),
            withdrawal_fee_btc_sats: Some(Nat::from(500u32)),
            withdrawal_fee_icp_e8s: None,
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
        assert_eq!(
            transaction.details,
            BridgeDetails::CkBTC {
                ckbtc_block_id: Some(99u64),
                deposit_fee_btc_sats: Some(Nat::from(1000u32)),
                withdrawal_fee_btc_sats: Some(Nat::from(500u32)),
            }
        );
        assert_eq!(transaction.block_id, Some(100u64));
        assert_eq!(transaction.block_timestamp, Some(1620001200u64));
        assert_eq!(transaction.block_confirmations.len(), 2);
        assert_eq!(transaction.btc_fee, Some(Nat::from(200u32)));
        assert_eq!(transaction.retry_times, 1);
        assert_eq!(transaction.status, BridgeTransactionStatus::Completed);
    }

    #[test]
    fn it_should_update_runes_bridge_transaction_omnity_ticket_id() {
        // Arrange
        let mut transaction = BridgeTransaction {
            details: BridgeDetails::Runes {
                omnity_ticket_id: None,
                withdrawal_fee_icp_e8s: None,
            },
            ..fixture_of_ckbtc_bridge_transaction()
        };

        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: "test_bridge_id".to_string(),
            asset_infos: None,
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: Some("ticket-123".to_string()),
            vin: None,
            vout: None,
        };

        // Act
        transaction.update(update_input);

        // Assert
        assert_eq!(
            transaction.details,
            BridgeDetails::Runes {
                omnity_ticket_id: Some("ticket-123".to_string()),
                withdrawal_fee_icp_e8s: None,
            }
        );
    }

    #[test]
    fn it_should_update_runes_withdrawal_fee_icp_e8s() {
        // Arrange
        let mut transaction = BridgeTransaction {
            details: BridgeDetails::Runes {
                omnity_ticket_id: None,
                withdrawal_fee_icp_e8s: None,
            },
            ..fixture_of_ckbtc_bridge_transaction()
        };

        let update_input = UpdateBridgeTransactionInputArg {
            bridge_id: "test_bridge_id".to_string(),
            asset_infos: None,
            btc_txid: None,
            ckbtc_block_id: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: None,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: Some(Nat::from(10_000u32)),
            btc_fee: None,
            retry_times: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        transaction.update(update_input);

        // Assert
        assert_eq!(
            transaction.details,
            BridgeDetails::Runes {
                omnity_ticket_id: None,
                withdrawal_fee_icp_e8s: Some(Nat::from(10_000u32)),
            }
        );
    }

    #[test]
    fn it_should_migrate_v3_ckbtc_fees_into_details() {
        // Arrange — a V3 record with deposit/withdrawal fees at top level
        let v3_tx = BridgeTransactionV3 {
            bridge_id: "bridge_v3".to_string(),
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "bc1qtest".to_string(),
            bridge_type: BridgeType::Import,
            asset_infos: vec![],
            btc_txid: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            deposit_fee: Some(Nat::from(1_000u32)),
            withdrawal_fee: None,
            btc_fee: Some(Nat::from(200u32)),
            created_at_ts: 0,
            total_amount: None,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            vin: None,
            vout: None,
            details: BridgeDetails::CkBTC {
                ckbtc_block_id: Some(42u64),
                deposit_fee_btc_sats: None,
                withdrawal_fee_btc_sats: None,
            },
        };

        // Act
        let decoded: Vec<BridgeTransaction> =
            BridgeTransactionCodec::decode(BridgeTransactionCodec::V3(vec![v3_tx]));

        // Assert
        assert_eq!(decoded.len(), 1);
        assert_eq!(
            decoded[0].details,
            BridgeDetails::CkBTC {
                ckbtc_block_id: Some(42u64),
                deposit_fee_btc_sats: Some(Nat::from(1_000u32)),
                withdrawal_fee_btc_sats: None,
            }
        );
        assert_eq!(decoded[0].btc_fee, Some(Nat::from(200u32)));
    }

    #[test]
    fn it_should_migrate_v3_runes_withdrawal_fee_into_details() {
        // Arrange — a V3 Runes export record with withdrawal_fee at top level
        let v3_tx = BridgeTransactionV3 {
            bridge_id: "rune_v3".to_string(),
            icp_address: Principal::from_text("aaaaa-aa").unwrap(),
            btc_address: "tb1qtest".to_string(),
            bridge_type: BridgeType::Export,
            asset_infos: vec![],
            btc_txid: None,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            deposit_fee: None,
            withdrawal_fee: Some(Nat::from(10_000u32)),
            btc_fee: None,
            created_at_ts: 0,
            total_amount: None,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
            vin: None,
            vout: None,
            details: BridgeDetails::Runes {
                omnity_ticket_id: Some("ticket-abc".to_string()),
                withdrawal_fee_icp_e8s: None,
            },
        };

        // Act
        let decoded: Vec<BridgeTransaction> =
            BridgeTransactionCodec::decode(BridgeTransactionCodec::V3(vec![v3_tx]));

        // Assert
        assert_eq!(decoded.len(), 1);
        assert_eq!(
            decoded[0].details,
            BridgeDetails::Runes {
                omnity_ticket_id: Some("ticket-abc".to_string()),
                withdrawal_fee_icp_e8s: Some(Nat::from(10_000u32)),
            }
        );
    }
}
