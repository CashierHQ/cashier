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
            v3::IntentV3,
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
        let token_standard = intent.asset.token_standard.clone();
        let from_wallet = {
            if intent.source_account.is_some()
                && let Some(source_account) = intent.source_account
            {
                source_account.into()
            } else {
                Wallet::new(intent.source_address)
            }
        };

        let to_wallet = {
            if intent.dest_account.is_some()
                && let Some(dest_account) = intent.dest_account
            {
                dest_account.into()
            } else {
                Wallet::new(intent.dest_address)
            }
        };

        let spender_wallet = Wallet::new(canister_id);
        let asset = Asset::IC {
            address: intent.asset.address,
        };

        let intent_standard: TokenStandardV3 = {
            if intent.source_address_type == AddressTypeV3::Link {
                Ok(TokenStandardV3::ICRC1)
            } else if intent.source_address_type == AddressTypeV3::Creator
                || intent.source_address_type == AddressTypeV3::User
            {
                Ok(token_standard)
            } else {
                Err(CanisterError::HandleLogicError(
                    "Unsupported address type".to_string(),
                ))
            }
        }?;

        let from_call_type: FromCallType = {
            if intent.source_address_type == AddressTypeV3::Link {
                FromCallType::Canister
            } else {
                FromCallType::Wallet
            }
        };

        match intent_standard {
            TokenStandardV3::ICRC1 => {
                let transfer_data = TransferData {
                    from: from_wallet,
                    to: to_wallet,
                    asset,
                    amount: (intent.total_amount.clone().unwrap_or_default()
                        + intent.network_fee.clone().unwrap_or_default()),
                };
                match from_call_type {
                    FromCallType::Canister => {
                        self.assemble_icrc1_canister_transfer(ts, transfer_data)
                    }
                    FromCallType::Wallet => self.assemble_icrc1_wallet_transfer(ts, transfer_data),
                }
            }
            TokenStandardV3::ICRC2 => {
                let transfer_from_data = TransferFromData {
                    from: from_wallet,
                    to: to_wallet,
                    spender: spender_wallet,
                    asset,
                    amount: intent.total_amount.clone().unwrap_or_default(),
                    approve_amount: Some(
                        intent.total_amount.clone().unwrap_or_default()
                            + intent.network_fee.clone().unwrap_or_default(),
                    ),
                    actual_amount: Some(intent.total_amount.clone().unwrap_or_default()),
                };
                self.assemble_icrc2_wallet_transfer(ts, transfer_from_data)
            }
        }
    }
}
