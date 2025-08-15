// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::{HashMap, HashSet, VecDeque};

use crate::{
    repositories::{transaction::TransactionRepository, Repositories},
    utils::{helper::to_subaccount, runtime::IcEnvironment},
};
use base64::Engine;
use candid::{Encode, Principal};
use cashier_backend_types::repository::transaction::v2::{
    IcTransaction, Protocol, Transaction, TransactionState,
};
use cashier_backend_types::{
    dto::action::{Icrc112Request, Icrc112Requests, TriggerTransactionInput},
    error::CanisterError,
};
use icrc_ledger_types::{
    icrc1::{account::Account, transfer::TransferArg},
    icrc2::approve::ApproveArgs,
};

#[derive(Clone)]
pub struct TransactionService<E: IcEnvironment + Clone, R: Repositories> {
    transaction_repository: TransactionRepository<R::Transaction>,
    ic_env: E,
}

impl<E: IcEnvironment + Clone, R: Repositories> TransactionService<E, R> {
    pub fn new(repo: &R, ic_env: E) -> Self {
        Self {
            transaction_repository: repo.transaction(),
            ic_env,
        }
    }

    // This method update the state of the transaction only
    // This is not included roll up logic for intent and action
    pub fn update_tx_state(
        &mut self,
        tx: &mut Transaction,
        state: &TransactionState,
    ) -> Result<(), CanisterError> {
        if tx.state == *state {
            return Ok(());
        }

        tx.state = state.clone(); // Clone instead of moving
        if tx.state == TransactionState::Processing {
            // For timeout task checking is timeout or not. Update the start_ts only when current function set the state to Processing.
            tx.start_ts = Some(self.ic_env.time());
        }

        self.transaction_repository.update(tx.clone());

        Ok(())
    }

    pub fn get_tx_by_id(&self, tx_id: &String) -> Result<Transaction, CanisterError> {
        self.transaction_repository
            .get(tx_id)
            .ok_or(CanisterError::NotFound(format!(
                "Transaction not found: {tx_id}"
            )))
    }

    pub fn batch_get(&self, tx_ids: &[String]) -> Result<Vec<Transaction>, CanisterError> {
        let txs = self.transaction_repository.batch_get(tx_ids.to_vec());

        if txs.len() != tx_ids.len() {
            return Err(CanisterError::NotFound(
                "Some transactions not found".to_string(),
            ));
        }

        Ok(txs)
    }

    pub fn convert_tx_to_icrc_112_request(
        &self,
        action_id: &str,
        link_id: &str,
        tx: &Transaction,
        canister_id: &Principal,
    ) -> Result<Icrc112Request, CanisterError> {
        match &tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(tx_transfer)) => {
                let account = Account {
                    owner: *canister_id,
                    subaccount: Some(to_subaccount(link_id)?),
                };

                let arg = TransferArg {
                    to: account,
                    amount: tx_transfer.amount.clone(),
                    memo: None,
                    fee: None,
                    created_at_time: None,
                    from_subaccount: None,
                };

                let canister_call = ic_icrc_tx::builder::icrc1::build_icrc1_transfer(
                    tx_transfer.asset.address.clone(),
                    arg,
                );

                Ok(Icrc112Request {
                    canister_id: canister_call.canister_id,
                    method: canister_call.method,
                    arg: canister_call.arg,
                    nonce: Some(tx.id.clone()),
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

                let canister_call = ic_icrc_tx::builder::icrc2::build_icrc2_approve(
                    tx_approve.asset.address.clone(),
                    arg,
                );

                Ok(Icrc112Request {
                    canister_id: canister_call.canister_id,
                    method: canister_call.method,
                    arg: canister_call.arg,
                    nonce: Some(tx.id.clone()),
                })
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(_tx_transfer_from)) => {
                let input = TriggerTransactionInput {
                    link_id: link_id.to_string(),
                    action_id: action_id.to_string(),
                    transaction_id: tx.id.clone(),
                };

                let method = "trigger_transaction";

                let arg = base64::engine::general_purpose::STANDARD.encode(Encode!(&input)?);

                Ok(Icrc112Request {
                    canister_id: canister_id.to_text(),
                    method: method.to_string(),
                    arg,
                    nonce: Some(tx.id.clone()),
                })
            }
        }
    }

    pub fn create_icrc_112(
        &self,
        action_id: &str,
        link_id: &str,
        transactions: &[Transaction],
    ) -> Result<Option<Icrc112Requests>, CanisterError> {
        let canister_id = self.ic_env.id();

        if transactions.is_empty() {
            return Ok(None);
        }

        // handle the case when there is only one transaction
        if transactions.len() == 1
            && let Some(tx) = transactions.first()
        {
            let icrc_112_request =
                self.convert_tx_to_icrc_112_request(action_id, link_id, tx, &canister_id)?;

            return Ok(Some(vec![vec![icrc_112_request]]));
        }

        // For consistency, use topological sort regardless of number of transactions
        let mut icrc_112_requests: Vec<Vec<Icrc112Request>> = Vec::new();
        let mut processed_tx_ids: HashSet<String> = HashSet::new();
        let tx_clone = transactions.to_owned();

        // Build dependency graph (corrected direction)
        // If A depends on B, then A should appear in B's adjacency list
        let mut in_degree: HashMap<String, usize> = HashMap::new();
        let mut adj_list: HashMap<String, Vec<String>> = HashMap::new();

        for tx in &tx_clone {
            in_degree.insert(tx.id.clone(), 0);
            adj_list.insert(tx.id.clone(), Vec::new());
        }

        for tx in &tx_clone {
            if let Some(dependencies) = &tx.dependency {
                for dep in dependencies {
                    if let Some(deps) = adj_list.get_mut(dep) {
                        deps.push(tx.id.clone());
                    }
                    *in_degree.entry(tx.id.clone()).or_insert(0) += 1;
                }
            }
        }

        let mut queue: VecDeque<String> = VecDeque::new();
        for (tx_id, &degree) in &in_degree {
            if degree == 0 {
                queue.push_back(tx_id.clone());
            }
        }

        while !queue.is_empty() {
            let mut current_group: Vec<Icrc112Request> = Vec::new();
            let mut next_queue: VecDeque<String> = VecDeque::new();

            while let Some(tx_id) = queue.pop_front() {
                if let Some(tx) = tx_clone.iter().find(|tx| tx.id == tx_id) {
                    let icrc_112_request =
                        self.convert_tx_to_icrc_112_request(action_id, link_id, tx, &canister_id)?;

                    current_group.push(icrc_112_request);

                    processed_tx_ids.insert(tx.id.clone());
                }

                if let Some(deps) = adj_list.get(&tx_id) {
                    for dep in deps {
                        if let Some(degree) = in_degree.get_mut(dep) {
                            *degree -= 1;
                            if *degree == 0 {
                                next_queue.push_back(dep.clone());
                            }
                        }
                    }
                }
            }

            if !current_group.is_empty() {
                icrc_112_requests.push(current_group);
            }

            queue = next_queue;
        }

        Ok(Some(icrc_112_requests))
    }
}
