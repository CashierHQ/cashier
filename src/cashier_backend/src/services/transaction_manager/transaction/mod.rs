use cashier_types::{Transaction, TransactionState};

use crate::{
    repositories::transaction::TransactionRepository, types::error::CanisterError,
    utils::runtime::IcEnvironment,
};

use super::action::ActionService;

pub mod icrc_112;

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
}
