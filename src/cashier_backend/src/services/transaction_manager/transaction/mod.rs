pub mod domain;

use cashier_types::{Transaction, TransactionState};
use domain::TransactionDomainLogic;

use crate::{
    repositories::transaction::TransactionRepository,
    types::{error::CanisterError, icrc_112_transaction::Icrc112Requests},
    utils::runtime::IcEnvironment,
};

#[cfg_attr(test, faux::create)]
pub struct TransactionService<E: IcEnvironment + Clone> {
    transaction_repository: TransactionRepository,
    ic_env: E,

    // domain logic
    domain_logic: TransactionDomainLogic,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> TransactionService<E> {
    pub fn new(transaction_repository: TransactionRepository, ic_env: E) -> Self {
        Self {
            transaction_repository,
            ic_env,
            domain_logic: TransactionDomainLogic::new(),
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

    pub fn create_icrc_112(
        &self,
        action_id: &str,
        link_id: &str,
        transactions: &Vec<Transaction>,
    ) -> Option<Icrc112Requests> {
        let canister_id = self.ic_env.id();

        self.domain_logic
            .create_icrc_112(action_id, link_id, transactions, &canister_id)
    }
}
