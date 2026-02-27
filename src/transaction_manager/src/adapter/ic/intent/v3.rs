// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        asset::{v1::Asset, v3::TokenStandardV3},
        common::{AddressTypeV3, Wallet},
        intent::{
            v1::{TransferData, TransferFromData},
            v3::{IntentTransactionDataV3, IntentV3},
        },
        transaction::v1::{FromCallType, Transaction},
    },
};

use crate::adapter::ic::intent::{traits::IntentAdapterTraitV3, v1::IcIntentAdapter};

impl IntentAdapterTraitV3 for IcIntentAdapter {
    fn intent_to_transactions_v3(
        &self,
        canister_id: Principal,
        ts: u64,
        intent: &IntentV3,
    ) -> Result<Vec<Transaction>, CanisterError> {
        match intent.intent_tx_data.clone() {
            Some(IntentTransactionDataV3::Transfer(transfer_data)) => {
                if intent.source_address_type == AddressTypeV3::Creator {
                    self.assemble_icrc1_wallet_transfer(ts, transfer_data)
                } else {
                    self.assemble_icrc1_canister_transfer(ts, transfer_data)
                }
            }
            Some(IntentTransactionDataV3::TransferFrom(transfer_from_data)) => {
                self.assemble_icrc2_wallet_transfer(ts, transfer_from_data)
            }
            None => Err(CanisterError::HandleLogicError(
                "Missing transaction data in intent".to_string(),
            )),
        }
    }
}
