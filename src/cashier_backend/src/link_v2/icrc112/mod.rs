// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::utils::helper::nonce_from_tx_id;
use candid::Principal;
use cashier_backend_types::{
    dto::action::Icrc112Request,
    error::CanisterError,
    repository::{
        common::Asset,
        transaction::v2::{IcTransaction, Protocol, Transaction},
    },
};
use icrc_112_utils::build_canister_call;
use icrc_ledger_types::{
    icrc1::{account::Account, transfer::TransferArg},
    icrc2::approve::ApproveArgs,
};

/// Converts a Transaction to an Icrc112Request for ICRC-1 or ICRC-2 token transfers.
/// # Arguments
/// * `tx` - The transaction to convert.
/// * `link_account` - The account to which the tokens will be transferred.
/// * `canister_id` - The canister ID of the token contract.
/// # Returns
/// * `Result<Icrc112Request, CanisterError>` - The resulting Icrc112Request or an error if the conversion fails.
pub fn convert_tx_to_icrc_112_request(
    tx: &Transaction,
    link_account: Account,
    canister_id: &Principal,
) -> Result<Icrc112Request, CanisterError> {
    match &tx.protocol {
        Protocol::IC(IcTransaction::Icrc1Transfer(tx_transfer)) => {
            let arg = TransferArg {
                to: link_account,
                amount: tx_transfer.amount.clone(),
                memo: None,
                fee: None,
                created_at_time: None,
                from_subaccount: None,
            };

            let canister_id = match tx_transfer.asset {
                Asset::IC { address } => address,
            };

            let canister_call = build_canister_call(&canister_id, "icrc1_transfer", &arg);
            let nonce = nonce_from_tx_id(&tx.id)?;

            Ok(Icrc112Request {
                canister_id: canister_call.canister_id,
                method: canister_call.method,
                arg: canister_call.arg,
                nonce: Some(nonce),
            })
        }
        Protocol::IC(IcTransaction::Icrc2Approve(tx_approve)) => {
            let spender = Account {
                owner: *canister_id,
                subaccount: None,
            };
            let arg = ApproveArgs {
                from_subaccount: None,
                spender,
                amount: tx_approve.amount.clone(),
                expected_allowance: None,
                expires_at: None,
                fee: None,
                memo: tx_approve.memo.clone(),
                created_at_time: None,
            };

            let canister_id = match tx_approve.asset {
                Asset::IC { address } => address,
            };

            let canister_call = build_canister_call(&canister_id, "icrc2_approve", &arg);
            let nonce = nonce_from_tx_id(&tx.id)?;

            Ok(Icrc112Request {
                canister_id: canister_call.canister_id,
                method: canister_call.method,
                arg: canister_call.arg,
                nonce: Some(nonce),
            })
        }
        _ => Err(CanisterError::HandleLogicError(
            "Unsupported transaction protocol for ICRC-112 request conversion".to_string(),
        )),
    }
}
