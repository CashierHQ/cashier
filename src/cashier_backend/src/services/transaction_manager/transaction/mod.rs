use std::collections::{HashMap, HashSet, VecDeque};

use crate::services::transaction_manager::builder::icrc112::TransactionBuilder;
use crate::types::icrc_112_transaction::Icrc112Requests;
use crate::{
    repositories::transaction::TransactionRepository,
    types::{error::CanisterError, icrc_112_transaction::Icrc112Request},
    utils::runtime::IcEnvironment,
};
use cashier_types::{IcTransaction, Protocol, Transaction, TransactionState};

use super::builder::icrc112::trigger_transaction::TriggerTransactionBuilder;
use super::{
    action::ActionService,
    builder::icrc112::{
        approve_cashier_fee::ApproveCashierFeeBuilder,
        transfer_to_link_escrow_wallet::TransferToLinkEscrowWalletBuilder,
    },
};

#[cfg_attr(test, faux::create)]
pub struct TransactionService<E: IcEnvironment + Clone> {
    transaction_repository: TransactionRepository,
    action_service: ActionService,
    ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> TransactionService<E> {
    pub fn new(
        transaction_repository: TransactionRepository,
        action_service: ActionService,
        ic_env: E,
    ) -> Self {
        Self {
            transaction_repository,
            action_service,
            ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            TransactionRepository::new(),
            ActionService::get_instance(),
            IcEnvironment::new(),
        )
    }

    pub fn update_tx_state(
        &self,
        tx: &mut Transaction,
        state: TransactionState,
    ) -> Result<(), String> {
        if tx.state == state {
            return Ok(());
        }

        tx.state = state;
        if tx.state == TransactionState::Processing {
            tx.start_ts = Some(self.ic_env.time());
        }

        self.transaction_repository.update(tx.clone());

        self.action_service
            .roll_up_state(tx.id.clone())
            .map_err(|e| format!("roll_up_state failed: {}", e))?;

        Ok(())
    }

    pub fn get_tx_by_id(&self, tx_id: &String) -> Result<Transaction, String> {
        self.transaction_repository
            .get(tx_id)
            .ok_or_else(|| format!("Transaction with id {} not found", tx_id))
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

    // TODO: handle the case icrc1 transfer execute by canister

    pub fn create_icrc_112(
        &self,
        action_id: String,
        link_id: String,
        transactions: &Vec<Transaction>,
    ) -> Option<Icrc112Requests> {
        let tx_clone = transactions.clone();

        if transactions.is_empty() {
            return None;
        }

        let mut icrc_112_requests: Vec<Vec<Icrc112Request>> = Vec::new();
        let mut processed_tx_ids: HashSet<String> = HashSet::new();

        // Topological sort for transactions
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
                        self.convert_tx_to_icrc_112_request(&action_id, link_id.clone(), tx);

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

    pub fn convert_tx_to_icrc_112_request(
        &self,
        action_id: &String,
        link_id: String,
        tx: &Transaction,
    ) -> Icrc112Request {
        match &tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(tx_transfer)) => {
                let builder = TransferToLinkEscrowWalletBuilder {
                    link_id: link_id.clone(),
                    token_address: tx_transfer.asset.address.clone(),
                    transfer_amount: tx_transfer.amount,
                    tx_id: tx.id.clone(),
                    ic_env: &self.ic_env,
                };

                builder.build()
            }
            Protocol::IC(IcTransaction::Icrc2Approve(tx_approve)) => {
                let builder = ApproveCashierFeeBuilder {
                    token_address: tx_approve.asset.address.clone(),
                    fee_amount: tx_approve.amount,
                    tx_id: tx.id.clone(),
                    ic_env: &self.ic_env,
                };

                builder.build()
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(_)) => {
                let builder = TriggerTransactionBuilder {
                    link_id: link_id.clone(),
                    action_id: action_id.to_string(),
                    tx_id: tx.id.clone(),
                    ic_env: &self.ic_env,
                };

                builder.build()
            }
        }
    }
}
