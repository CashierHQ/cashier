// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use std::collections::{HashMap, HashSet, VecDeque};

use crate::{
    core::action::types::TriggerTransactionInput,
    repositories::transaction::TransactionRepository,
    types::{
        error::CanisterError,
        icrc_112_transaction::{Icrc112Request, Icrc112Requests},
    },
    utils::{helper::to_subaccount, runtime::IcEnvironment},
};
use base64::Engine;
use candid::{Encode, Nat, Principal};
use cashier_types::{IcTransaction, Protocol, Transaction, TransactionState};
use icrc_ledger_types::{
    icrc1::{account::Account, transfer::TransferArg},
    icrc2::approve::ApproveArgs,
};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct TransactionService<E: IcEnvironment + Clone> {
    transaction_repository: TransactionRepository,
    ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> TransactionService<E> {
    pub fn new(transaction_repository: TransactionRepository, ic_env: E) -> Self {
        Self {
            transaction_repository,
            ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(TransactionRepository::new(), IcEnvironment::new())
    }

    // This method update the state of the transaction only
    // This is not included roll up logic for intent and action
    pub fn update_tx_state(
        &self,
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
            .ok_or(CanisterError::NotFound("Transaction not found".to_string()))
    }

    pub fn batch_get(&self, tx_ids: Vec<String>) -> Result<Vec<Transaction>, CanisterError> {
        let txs = self.transaction_repository.batch_get(tx_ids.clone());

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
    ) -> Icrc112Request {
        match &tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(tx_transfer)) => {
                let account = Account {
                    owner: *canister_id,
                    subaccount: Some(to_subaccount(link_id)),
                };

                let arg = TransferArg {
                    to: account,
                    amount: Nat::from(tx_transfer.amount),
                    memo: None,
                    fee: None,
                    created_at_time: None,
                    from_subaccount: None,
                };

                let canister_call = ic_icrc_tx::builder::icrc1::build_icrc1_transfer(
                    tx_transfer.asset.address.clone(),
                    arg,
                );

                Icrc112Request {
                    canister_id: canister_call.canister_id,
                    method: canister_call.method,
                    arg: canister_call.arg,
                    nonce: Some(tx.id.clone()),
                }
            }
            Protocol::IC(IcTransaction::Icrc2Approve(tx_approve)) => {
                let spender = Account {
                    owner: *canister_id,
                    subaccount: None,
                };

                let arg = ApproveArgs {
                    from_subaccount: None,
                    spender,
                    amount: Nat::from(tx_approve.amount),
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

                Icrc112Request {
                    canister_id: canister_call.canister_id,
                    method: canister_call.method,
                    arg: canister_call.arg,
                    nonce: Some(tx.id.clone()),
                }
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(_tx_transfer_from)) => {
                let input = TriggerTransactionInput {
                    link_id: link_id.to_string(),
                    action_id: action_id.to_string(),
                    transaction_id: tx.id.clone(),
                };

                let method = "trigger_transaction";
                let arg =
                    base64::engine::general_purpose::STANDARD.encode(Encode!(&input).unwrap());

                Icrc112Request {
                    canister_id: canister_id.to_text(),
                    method: method.to_string(),
                    arg,
                    nonce: Some(tx.id.clone()),
                }
            }
        }
    }

    pub fn create_icrc_112(
        &self,
        action_id: &str,
        link_id: &str,
        transactions: &Vec<Transaction>,
    ) -> Option<Icrc112Requests> {
        let canister_id = self.ic_env.id();

        if transactions.is_empty() {
            return None;
        }

        // handle the case when there is only one transaction
        if transactions.len() == 1 {
            let tx = &transactions[0];
            let icrc_112_request =
                self.convert_tx_to_icrc_112_request(action_id, link_id, tx, &canister_id);

            return Some(vec![vec![icrc_112_request]]);
        }

        // For consistency, use topological sort regardless of number of transactions
        let mut icrc_112_requests: Vec<Vec<Icrc112Request>> = Vec::new();
        let mut processed_tx_ids: HashSet<String> = HashSet::new();
        let tx_clone = transactions.clone();

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
                        self.convert_tx_to_icrc_112_request(action_id, link_id, tx, &canister_id);

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

        Some(icrc_112_requests)
    }
}
