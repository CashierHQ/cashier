use std::collections::HashMap;

use crate::services::transaction_manager::builder::icrc112::TransactionBuilder;
use crate::types::icrc_112_transaction::{Icrc112Requests, Icrc112RequestsBuilder};
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
        if transactions.is_empty() {
            return None;
        }

        let mut icrc_112_requests_builder = Icrc112RequestsBuilder::new();

        let mut tx_group_hashmap: HashMap<u16, Vec<Transaction>> = HashMap::new();

        // group tx by group
        for tx in transactions.iter() {
            tx_group_hashmap
                .entry(tx.group)
                .or_insert(vec![])
                .push(tx.clone());
        }

        // Collect and sort the keys
        let mut sorted_keys: Vec<u16> = tx_group_hashmap.keys().cloned().collect();
        sorted_keys.sort();

        let mut current_group = 1;

        // for each group add request to builder
        // if tx has no dependency, add it to the current group
        // if tx has dependency, add it to the next group
        // increase group index after each group
        for key in sorted_keys {
            if let Some(mut txs) = tx_group_hashmap.remove(&key) {
                // Separate transactions without dependencies and those with dependencies
                let (no_deps, with_deps): (Vec<_>, Vec<_>) =
                    txs.drain(..).partition(|tx| tx.dependency.is_none());

                for tx in no_deps {
                    let icrc_112_request =
                        self.convert_tx_to_icrc_112_request(&action_id, link_id.clone(), &tx);

                    icrc_112_requests_builder.add_request_to_group(
                        current_group as usize,
                        tx.id.clone(),
                        icrc_112_request,
                    );
                }

                for tx in with_deps {
                    current_group += 1;
                    let icrc_112_request =
                        self.convert_tx_to_icrc_112_request(&action_id, link_id.clone(), &tx);

                    icrc_112_requests_builder.add_request_to_group(
                        current_group as usize,
                        tx.id.clone(),
                        icrc_112_request,
                    );
                }

                current_group += 1;
            }
        }

        Some(icrc_112_requests_builder.build())
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
