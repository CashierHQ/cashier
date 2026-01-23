// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use token_storage_types::{
    bitcoin::bridge_transaction::{BridgeTransaction, BridgeTransactionStatus, BridgeType},
    dto::bitcoin::CreateBridgeTransactionInputArg,
    error::CanisterError,
};
use uuid::Uuid;

pub struct BridgeTransactionFactory;

impl BridgeTransactionFactory {
    pub fn from_create_input(
        input: CreateBridgeTransactionInputArg,
    ) -> Result<BridgeTransaction, CanisterError> {
        let mut bridge_id = Uuid::new_v4().to_string();
        let mut btc_txid = None;
        let mut asset_infos = input.asset_infos.clone();

        let mut deposit_fee = None;
        if let Some(fee) = input.deposit_fee {
            deposit_fee = Some(fee);
        }
        let mut withdrawal_fee = None;
        if let Some(fee) = input.withdrawal_fee {
            withdrawal_fee = Some(fee);
        }

        if input.bridge_type == BridgeType::Import {
            if let Some(txid) = &input.btc_txid {
                bridge_id = format!("import_{}", txid);
                btc_txid = Some(txid.clone());
            } else {
                return Err(CanisterError::ValidationErrors(
                    "btc_txid is required for import".to_string(),
                ));
            }

            // deduct the deposit fee from the first asset info amount
            if let Some(deposit_fee) = &deposit_fee {
                // find first asset with amount greater than deposit fee and deduct the fee
                if let Some(first_asset) = asset_infos
                    .iter_mut()
                    .find(|asset| asset.amount.clone() > deposit_fee.clone())
                {
                    first_asset.amount -= deposit_fee.clone();
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
            && total_amount < deposit_fee.clone().unwrap_or(Nat::from(0u32))
        {
            return Err(CanisterError::ValidationErrors(
                "Deposit fee exceeds total amount".to_string(),
            ));
        }

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
            deposit_fee,
            withdrawal_fee,
            total_amount: Some(total_amount),
            created_at_ts: input.created_at_ts,
            retry_times: 0,
            status: BridgeTransactionStatus::Created,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn it_shoulf_create_bridge_transaction_from_input() {
        // Arrange
        let icp_address = random_principal_id();
        let input = CreateBridgeTransactionInputArg {
            btc_txid: Some("test_txid".to_string()),
            icp_address,
            btc_address: "test_btc_address".to_string(),
            asset_infos: vec![],
            bridge_type: BridgeType::Import,
            deposit_fee: None,
            withdrawal_fee: None,
            created_at_ts: 0,
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
        assert_eq!(transaction.block_id, None);
        assert_eq!(transaction.block_confirmations.len(), 0);
        assert_eq!(transaction.status, BridgeTransactionStatus::Created);
        assert_eq!(transaction.created_at_ts, 0);
    }
}
