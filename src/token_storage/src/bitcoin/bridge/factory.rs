// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use token_storage_types::{
    bitcoin::bridge_transaction::{
        BridgeAssetType, BridgeDetails, BridgeTransaction, BridgeTransactionStatus, BridgeType,
    },
    dto::bitcoin::CreateBridgeTransactionInputArg,
    error::CanisterError,
};
use uuid::Uuid;

pub struct BridgeTransactionFactory;

impl BridgeTransactionFactory {
    /// Create a bridge transaction from the given input
    /// # Arguments
    /// * `input` - The input data for creating the bridge transaction
    /// # Returns
    /// * `Ok(BridgeTransaction)` if the input is valid and the bridge transaction is created successfully
    /// * `Err(CanisterError)` if the input is invalid or there is an error during creation
    pub fn from_create_input(
        input: CreateBridgeTransactionInputArg,
    ) -> Result<BridgeTransaction, CanisterError> {
        let is_runes = input
            .asset_infos
            .iter()
            .any(|asset| matches!(asset.asset_type, BridgeAssetType::Runes));

        let is_runes_export = input.bridge_type == BridgeType::Export && is_runes;

        if input.bridge_type == BridgeType::Export {
            if input.btc_txid.is_some() {
                return Err(CanisterError::ValidationErrors(
                    "btc_txid must not be set when creating an export bridge".to_string(),
                ));
            }

            if input.deposit_fee_btc_sats.is_some() {
                return Err(CanisterError::ValidationErrors(
                    "deposit_fee must not be set for export bridges".to_string(),
                ));
            }

            if input.withdrawal_fee_btc_sats.is_none() && !is_runes_export {
                return Err(CanisterError::ValidationErrors(
                    "withdrawal_fee is required for export bridges".to_string(),
                ));
            }

            if input.btc_fee.is_none() && !is_runes_export {
                return Err(CanisterError::ValidationErrors(
                    "btc_fee is required for export bridges".to_string(),
                ));
            }

            if input.asset_infos.is_empty() {
                return Err(CanisterError::ValidationErrors(
                    "asset_infos is required for export bridges".to_string(),
                ));
            }
        }

        let mut bridge_id = Uuid::new_v4().to_string();
        let mut btc_txid = None;
        let mut asset_infos = input.asset_infos.clone();

        let deposit_fee_btc_sats = input.deposit_fee_btc_sats.clone();
        let withdrawal_fee_btc_sats = input.withdrawal_fee_btc_sats.clone();
        let withdrawal_fee_icp_e8s = input.withdrawal_fee_icp_e8s.clone();
        let btc_fee = input.btc_fee.clone();

        let mut ckbtc_block_id = None;

        if input.bridge_type == BridgeType::Import {
            if let Some(txid) = &input.btc_txid {
                // Normal mempool-driven import: bridge ID derived from BTC txid
                bridge_id = format!("import_{}", txid);
                btc_txid = Some(txid.clone());
            } else if let Some(block_id) = input.ckbtc_block_id {
                // Manual refresh import: bridge ID derived from ckBTC block index
                bridge_id = format!("import_ckbtc_{}", block_id);
                ckbtc_block_id = Some(block_id);
            } else {
                return Err(CanisterError::ValidationErrors(
                    "btc_txid or ckbtc_block_id is required for import".to_string(),
                ));
            }

            // deduct the deposit fee from the first asset info amount
            if let Some(fee) = &deposit_fee_btc_sats {
                // find first asset with amount greater than deposit fee and deduct the fee
                if let Some(first_asset) = asset_infos
                    .iter_mut()
                    .find(|asset| asset.amount.clone() > fee.clone())
                {
                    first_asset.amount -= fee.clone();
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "No asset with sufficient amount to cover deposit fee".to_string(),
                    ));
                }
            }
        }

        let mut total_amount = Nat::from(0u32);
        for asset_info in &asset_infos {
            total_amount += asset_info.amount.clone();
        }

        if input.bridge_type == BridgeType::Import
            && total_amount < deposit_fee_btc_sats.clone().unwrap_or(Nat::from(0u32))
        {
            return Err(CanisterError::ValidationErrors(
                "Deposit fee exceeds total amount".to_string(),
            ));
        }

        // Determine initial status: use caller-provided override if present,
        // otherwise default to Pending for Import and Created for Export.
        let status = input
            .status
            .unwrap_or(if input.bridge_type == BridgeType::Import {
                BridgeTransactionStatus::Pending
            } else {
                BridgeTransactionStatus::Created
            });

        let details = if is_runes {
            BridgeDetails::Runes {
                omnity_ticket_id: input.omnity_ticket_id,
                withdrawal_fee_icp_e8s,
            }
        } else {
            BridgeDetails::CkBTC {
                ckbtc_block_id,
                deposit_fee_btc_sats,
                withdrawal_fee_btc_sats,
            }
        };

        Ok(BridgeTransaction {
            bridge_id,
            icp_address: input.icp_address,
            btc_address: input.btc_address,
            bridge_type: input.bridge_type,
            asset_infos,
            btc_txid,
            block_id: None,
            block_timestamp: None,
            block_confirmations: vec![],
            btc_fee,
            total_amount: Some(total_amount),
            created_at_ts: input.created_at_ts,
            retry_times: 0,
            status,
            vin: input.vin,
            vout: input.vout,
            details,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_common::test_utils::random_principal_id;
    use token_storage_types::bitcoin::bridge_transaction::{
        BridgeAssetInfo, BridgeAssetType, UTXO,
    };

    fn fixture_of_utxos(prefix: &str) -> Vec<UTXO> {
        vec![
            UTXO {
                txid: format!("{prefix}_txid_1"),
                vout: 0,
            },
            UTXO {
                txid: format!("{prefix}_txid_2"),
                vout: 1,
            },
        ]
    }

    #[test]
    fn it_should_create_import_bridge_transaction_from_input() {
        // Arrange
        let icp_address = random_principal_id();
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_txid".to_string()),
            icp_address,
            btc_address: "test_btc_address".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let transaction: BridgeTransaction =
            BridgeTransactionFactory::from_create_input(input).unwrap();

        // Assert
        assert_eq!(transaction.icp_address, icp_address);
        assert_eq!(transaction.btc_address, "test_btc_address".to_string());
        assert_eq!(transaction.asset_infos.len(), 0);
        assert_eq!(transaction.bridge_type, BridgeType::Import);
        assert_eq!(transaction.btc_txid, Some("test_txid".to_string()));
        assert_eq!(
            transaction.details,
            BridgeDetails::CkBTC {
                ckbtc_block_id: None,
                deposit_fee_btc_sats: None,
                withdrawal_fee_btc_sats: None,
            }
        );
        assert_eq!(transaction.block_id, None);
        assert_eq!(transaction.block_confirmations.len(), 0);
        assert_eq!(transaction.status, BridgeTransactionStatus::Pending);
        assert_eq!(transaction.created_at_ts, 0);
    }

    #[test]
    fn it_should_create_export_bridge_transaction_from_input() {
        // Arrange
        let icp_address = random_principal_id();
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address,
            btc_address: "bc1qreceiver".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "ckbtc".to_string(),
                amount: Nat::from(125_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Export,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: Some(Nat::from(450u64)),
            withdrawal_fee_icp_e8s: None,
            btc_fee: Some(Nat::from(1200u64)),
            created_at_ts: 123,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let transaction = BridgeTransactionFactory::from_create_input(input).unwrap();

        // Assert
        assert_eq!(transaction.icp_address, icp_address);
        assert_eq!(transaction.btc_address, "bc1qreceiver".to_string());
        assert_eq!(transaction.bridge_type, BridgeType::Export);
        assert_eq!(transaction.btc_txid, None);
        assert_eq!(
            transaction.details,
            BridgeDetails::CkBTC {
                ckbtc_block_id: None,
                deposit_fee_btc_sats: None,
                withdrawal_fee_btc_sats: Some(Nat::from(450u64)),
            }
        );
        assert_eq!(transaction.btc_fee, Some(Nat::from(1200u64)));
        assert_eq!(transaction.total_amount, Some(Nat::from(125_000u64)));
        assert_eq!(transaction.status, BridgeTransactionStatus::Created);
    }

    #[test]
    fn it_should_reject_export_bridge_with_btc_txid() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("unexpected".to_string()),
            icp_address: random_principal_id(),
            btc_address: "bc1qreceiver".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "ckbtc".to_string(),
                amount: Nat::from(125_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Export,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: Some(Nat::from(1200u64)),
            created_at_ts: 123,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = BridgeTransactionFactory::from_create_input(input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_txid must not be set when creating an export bridge"
        ));
    }

    #[test]
    fn it_should_fail_create_export_bridge_with_deposit_fee() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: random_principal_id(),
            btc_address: "bc1qreceiver".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "ckbtc".to_string(),
                amount: Nat::from(125_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Export,
            deposit_fee_btc_sats: Some(Nat::from(1000u64)),
            withdrawal_fee_btc_sats: Some(Nat::from(450u64)),
            withdrawal_fee_icp_e8s: None,
            btc_fee: Some(Nat::from(1200u64)),
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = BridgeTransactionFactory::from_create_input(input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "deposit_fee must not be set for export bridges"
        ));
    }

    #[test]
    fn it_should_fail_create_export_bridge_without_withdrawal_fee() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: random_principal_id(),
            btc_address: "bc1qreceiver".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "ckbtc".to_string(),
                amount: Nat::from(125_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Export,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: Some(Nat::from(1200u64)),
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = BridgeTransactionFactory::from_create_input(input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "withdrawal_fee is required for export bridges"
        ));
    }

    #[test]
    fn it_should_fail_create_export_bridge_without_btc_fee() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: random_principal_id(),
            btc_address: "bc1qreceiver".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "ckbtc".to_string(),
                amount: Nat::from(125_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Export,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: Some(Nat::from(450u64)),
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = BridgeTransactionFactory::from_create_input(input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_fee is required for export bridges"
        ));
    }

    #[test]
    fn it_should_fail_create_export_bridge_without_asset_infos() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: random_principal_id(),
            btc_address: "bc1qreceiver".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Export,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: Some(Nat::from(450u64)),
            withdrawal_fee_icp_e8s: None,
            btc_fee: Some(Nat::from(1200u64)),
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = BridgeTransactionFactory::from_create_input(input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "asset_infos is required for export bridges"
        ));
    }

    #[test]
    fn it_should_fail_create_import_bridge_without_btc_txid_or_ckbtc_block_id() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address: random_principal_id(),
            btc_address: "test_btc_address".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = BridgeTransactionFactory::from_create_input(input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "btc_txid or ckbtc_block_id is required for import"
        ));
    }

    #[test]
    fn it_should_fail_create_import_bridge_due_to_insufficient_amount_for_deposit_fee() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_txid".to_string()),
            icp_address: random_principal_id(),
            btc_address: "test_btc_address".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "UTXO".to_string(),
                amount: Nat::from(500u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Import,
            deposit_fee_btc_sats: Some(Nat::from(1000u64)),
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let result = BridgeTransactionFactory::from_create_input(input);

        // Assert
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            CanisterError::ValidationErrors(message)
                if message == "No asset with sufficient amount to cover deposit fee"
        ));
    }

    #[test]
    fn it_should_create_import_bridge_via_ckbtc_block_id() {
        // Arrange
        let icp_address = random_principal_id();
        let block_id = 42u64;
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address,
            btc_address: "test_btc_address".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::BTC,
                asset_id: "UTXO".to_string(),
                amount: Nat::from(50_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Import,
            deposit_fee_btc_sats: Some(Nat::from(1000u64)),
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: Some(block_id),
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let transaction = BridgeTransactionFactory::from_create_input(input).unwrap();

        // Assert
        assert_eq!(transaction.bridge_id, format!("import_ckbtc_{}", block_id));
        assert_eq!(transaction.btc_txid, None);
        assert_eq!(
            transaction.details,
            BridgeDetails::CkBTC {
                ckbtc_block_id: Some(block_id),
                deposit_fee_btc_sats: Some(Nat::from(1000u64)),
                withdrawal_fee_btc_sats: None,
            }
        );
        assert_eq!(transaction.status, BridgeTransactionStatus::Completed);
        // deposit fee is deducted from asset amount
        assert_eq!(transaction.asset_infos[0].amount, Nat::from(49_000u64));
    }

    #[test]
    fn it_should_create_import_bridge_with_status_override() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_txid".to_string()),
            icp_address: random_principal_id(),
            btc_address: "test_btc_address".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: Some(BridgeTransactionStatus::Completed),
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let transaction = BridgeTransactionFactory::from_create_input(input).unwrap();

        // Assert
        assert_eq!(transaction.status, BridgeTransactionStatus::Completed);
    }

    #[test]
    fn it_should_create_runes_import_bridge_with_vin_and_vout() {
        // Arrange
        let vin = fixture_of_utxos("vin");
        let vout = fixture_of_utxos("vout");
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("rune_txid".to_string()),
            icp_address: random_principal_id(),
            btc_address: "tb1qruneaddress".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::Runes,
                asset_id: "UNCOMMON•GOODS".to_string(),
                amount: Nat::from(50_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Import,
            deposit_fee_btc_sats: Some(Nat::from(1_000u64)),
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: Some(vin.clone()),
            vout: Some(vout.clone()),
        };

        // Act
        let transaction = BridgeTransactionFactory::from_create_input(input).unwrap();

        // Assert
        assert_eq!(transaction.bridge_id, "import_rune_txid".to_string());
        assert_eq!(transaction.btc_txid, Some("rune_txid".to_string()));
        assert_eq!(transaction.status, BridgeTransactionStatus::Pending);
        assert_eq!(transaction.vin, Some(vin));
        assert_eq!(transaction.vout, Some(vout));
        assert_eq!(transaction.asset_infos.len(), 1);
        assert_eq!(
            transaction.asset_infos[0].asset_type,
            BridgeAssetType::Runes
        );
        assert_eq!(transaction.asset_infos[0].amount, Nat::from(49_000u64));
        assert_eq!(
            transaction.details,
            BridgeDetails::Runes {
                omnity_ticket_id: None,
                withdrawal_fee_icp_e8s: None,
            }
        );
    }

    #[test]
    fn it_should_create_confirmed_runes_import_bridge_with_omnity_ticket_id() {
        // Arrange
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("rune_txid".to_string()),
            icp_address: random_principal_id(),
            btc_address: "tb1qruneaddress".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::Runes,
                asset_id: "UNCOMMON•GOODS".to_string(),
                amount: Nat::from(50_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Import,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: None,
            btc_fee: None,
            created_at_ts: 0,
            ckbtc_block_id: None,
            status: Some(BridgeTransactionStatus::Confirmed),
            omnity_ticket_id: Some("rune_txid".to_string()),
            vin: None,
            vout: None,
        };

        // Act
        let transaction = BridgeTransactionFactory::from_create_input(input).unwrap();

        // Assert
        assert_eq!(transaction.status, BridgeTransactionStatus::Confirmed);
        assert_eq!(
            transaction.details,
            BridgeDetails::Runes {
                omnity_ticket_id: Some("rune_txid".to_string()),
                withdrawal_fee_icp_e8s: None,
            }
        );
    }

    #[test]
    fn it_should_create_runes_export_bridge_transaction_from_input() {
        // Arrange
        let icp_address = random_principal_id();
        let input = CreateBridgeTransactionInputArg {
            btc_txid: None,
            icp_address,
            btc_address: "bc1qrunesreceiver".to_string(),
            asset_infos: vec![BridgeAssetInfo {
                asset_type: BridgeAssetType::Runes,
                asset_id: "UNCOMMON•GOODS".to_string(),
                amount: Nat::from(125_000u64),
                decimals: 8,
            }],
            bridge_type: BridgeType::Export,
            deposit_fee_btc_sats: None,
            withdrawal_fee_btc_sats: None,
            withdrawal_fee_icp_e8s: Some(Nat::from(10_000u64)),
            btc_fee: None,
            created_at_ts: 123,
            ckbtc_block_id: None,
            status: None,
            omnity_ticket_id: None,
            vin: None,
            vout: None,
        };

        // Act
        let transaction = BridgeTransactionFactory::from_create_input(input).unwrap();

        // Assert
        assert_eq!(transaction.icp_address, icp_address);
        assert_eq!(transaction.btc_address, "bc1qrunesreceiver".to_string());
        assert_eq!(transaction.bridge_type, BridgeType::Export);
        assert_eq!(transaction.status, BridgeTransactionStatus::Created);
        assert_eq!(transaction.asset_infos.len(), 1);
        assert_eq!(
            transaction.asset_infos[0].asset_type,
            BridgeAssetType::Runes
        );
        assert_eq!(transaction.asset_infos[0].asset_id, "UNCOMMON•GOODS");
        assert_eq!(transaction.total_amount, Some(Nat::from(125_000u64)));
        assert_eq!(transaction.btc_fee, None);
        assert_eq!(
            transaction.details,
            BridgeDetails::Runes {
                omnity_ticket_id: None,
                withdrawal_fee_icp_e8s: Some(Nat::from(10_000u64)),
            }
        );
        assert_eq!(transaction.btc_txid, None);
    }
}
