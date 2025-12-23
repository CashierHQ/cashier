// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::topological_sort::kahn_topological_sort;
use candid::Principal;
use cashier_backend_types::{
    dto::action::{Icrc112Request, Icrc112Requests},
    error::CanisterError,
    link_v2::graph::Graph,
    repository::{
        common::Asset,
        transaction::v1::{FromCallType, IcTransaction, Protocol, Transaction, TransactionState},
    },
};
use cashier_common::constant::ICRC_TRANSACTION_TIME_WINDOW_NANOSECS;
use cashier_common::utils::nonce_from_tx_id;
use icrc_112_utils::build_canister_call;
use icrc_ledger_types::{
    icrc1::{account::Account, transfer::TransferArg},
    icrc2::approve::ApproveArgs,
};
use std::collections::HashMap;

/// Creates ICRC-112 requests from a list of transactions
/// The input transactions are topologically sorted based on their dependencies,
/// then converted to ICRC-112 requests.
/// # Arguments
/// * `transactions` - A reference to a vector of Transactions
/// * `link_account` - The account to which the tokens will be transferred
/// * `canister_id` - The canister ID of the token contract
/// * `current_ts` - The current timestamp to be used for created_at_time fields
/// # Returns
/// * `Result<Icrc112Requests, CanisterError>` - The resulting Icrc112Requests or an error
pub fn create_icrc_112_requests(
    transactions: &mut [Transaction],
    link_account: Account,
    canister_id: Principal,
    current_ts: u64,
) -> Result<Icrc112Requests, CanisterError> {
    // filter only wallet transactions
    let wallet_transactions: Vec<Transaction> = transactions
        .iter()
        .filter(|tx| tx.from_call_type == FromCallType::Wallet)
        .cloned()
        .collect();

    // filter only CREATED or FAILED transactions
    let wallet_transactions: Vec<Transaction> = wallet_transactions
        .into_iter()
        .filter(|tx| tx.state == TransactionState::Created || tx.state == TransactionState::Fail)
        .collect();

    let tx_graph: Graph = wallet_transactions.clone().into();
    let sorted_txs = kahn_topological_sort(&tx_graph)?;

    let mut tx_map: HashMap<String, Transaction> = wallet_transactions
        .into_iter()
        .map(|tx| (tx.id.clone(), tx))
        .collect();

    let mut icrc_112_requests = Vec::<Vec<Icrc112Request>>::new();
    for tx_group in sorted_txs.iter() {
        let mut group_requests = Vec::<Icrc112Request>::new();
        for tx_id in tx_group.iter() {
            if let Some(tx) = tx_map.get_mut(tx_id) {
                let icrc_112_request =
                    convert_tx_to_icrc_112_request(tx, link_account, canister_id, current_ts)?;
                group_requests.push(icrc_112_request);
            }
        }
        if !group_requests.is_empty() {
            icrc_112_requests.push(group_requests);
        }
    }

    // update the original transactions using the modified tx_map
    for tx in transactions.iter_mut() {
        if let Some(updated_tx) = tx_map.get(&tx.id) {
            *tx = updated_tx.clone();
        }
    }

    Ok(icrc_112_requests)
}

/// Converts a Transaction to an Icrc112Request for ICRC-1 or ICRC-2 token transfers.
/// # Arguments
/// * `tx` - The transaction to convert.
/// * `link_account` - The account to which the tokens will be transferred.
/// * `canister_id` - The canister ID of the token contract.
/// * `current_ts` - The current timestamp to be used for the created_at_time field.
/// # Returns
/// * `Result<Icrc112Request, CanisterError>` - The resulting Icrc112Request or an error if the conversion fails.
pub fn convert_tx_to_icrc_112_request(
    tx: &mut Transaction,
    link_account: Account,
    canister_id: Principal,
    current_ts: u64,
) -> Result<Icrc112Request, CanisterError> {
    match &mut tx.protocol {
        Protocol::IC(IcTransaction::Icrc1Transfer(tx_transfer)) => {
            let memo = tx_transfer.clone().memo.ok_or_else(|| {
                CanisterError::InvalidDataError("Transaction memo should not be empty".to_string())
            })?;

            // update the created_at_time to current_ts if the tx created_at_time is outdated
            let mut created_at_time = tx_transfer.clone().ts.ok_or_else(|| {
                CanisterError::InvalidDataError(
                    "Transaction timestamp should not be empty".to_string(),
                )
            })?;

            if (current_ts as i64 - created_at_time as i64)
                > ICRC_TRANSACTION_TIME_WINDOW_NANOSECS as i64
            {
                created_at_time = current_ts;
                tx_transfer.ts = Some(created_at_time);
            }

            let arg = TransferArg {
                to: link_account,
                amount: tx_transfer.amount.clone(),
                from_subaccount: None,
                fee: None,
                created_at_time: Some(created_at_time),
                memo: Some(memo),
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
            let memo = tx_approve.clone().memo.ok_or_else(|| {
                CanisterError::InvalidDataError("Transaction memo should not be empty".to_string())
            })?;

            // update the created_at_time to current_ts if the tx created_at_time is outdated
            let mut created_at_time = tx_approve.clone().ts.ok_or_else(|| {
                CanisterError::InvalidDataError(
                    "Transaction timestamp should not be empty".to_string(),
                )
            })?;

            if (current_ts as i64 - created_at_time as i64)
                > ICRC_TRANSACTION_TIME_WINDOW_NANOSECS as i64
            {
                created_at_time = current_ts;
                tx_approve.ts = Some(created_at_time);
            }

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
                memo: Some(memo),
                created_at_time: Some(created_at_time),
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
