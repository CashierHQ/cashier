// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    link_v2::transaction_manager::topological_sort::kahn_topological_sort,
    utils::helper::nonce_from_tx_id,
};
use candid::Principal;
use cashier_backend_types::{
    dto::action::{Icrc112Request, Icrc112Requests},
    error::CanisterError,
    link_v2::graph::Graph,
    repository::{
        common::Asset,
        transaction::v1::{FromCallType, IcTransaction, Protocol, Transaction},
    },
};
use icrc_112_utils::build_canister_call;
use icrc_ledger_types::{
    icrc1::{account::Account, transfer::TransferArg},
    icrc2::approve::ApproveArgs,
};
use log::debug;
use std::collections::HashMap;

/// Creates ICRC-112 requests from a list of transactions
/// The input transactions are topologically sorted based on their dependencies,
/// then converted to ICRC-112 requests.
/// # Arguments
/// * `transactions` - A reference to a vector of Transactions
/// * `link_account` - The account to which the tokens will be transferred
/// * `canister_id` - The canister ID of the token contract
/// # Returns
/// * `Result<Icrc112Requests, CanisterError>` - The resulting Icrc112Requests or an error
pub fn create_icrc_112_requests(
    transactions: &[Transaction],
    link_account: Account,
    canister_id: Principal,
) -> Result<Icrc112Requests, CanisterError> {
    // filter only wallet transactions
    let wallet_transactions: Vec<Transaction> = transactions
        .iter()
        .filter(|tx| tx.from_call_type == FromCallType::Wallet)
        .cloned()
        .collect();

    let tx_graph: Graph = wallet_transactions.clone().into();
    let sorted_txs = kahn_topological_sort(&tx_graph)?;

    let tx_map: HashMap<String, &Transaction> = wallet_transactions
        .iter()
        .map(|tx| (tx.id.clone(), tx))
        .collect();

    let mut icrc_112_requests = Vec::<Vec<Icrc112Request>>::new();
    for tx_group in sorted_txs.iter() {
        let mut group_requests = Vec::<Icrc112Request>::new();
        for tx_id in tx_group.iter() {
            if let Some(tx) = tx_map.get(tx_id) {
                let icrc_112_request =
                    convert_tx_to_icrc_112_request(tx, link_account, canister_id)?;
                group_requests.push(icrc_112_request);
            }
        }
        if !group_requests.is_empty() {
            icrc_112_requests.push(group_requests);
        }
    }

    Ok(icrc_112_requests)
}

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
    canister_id: Principal,
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
                owner: canister_id,
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
