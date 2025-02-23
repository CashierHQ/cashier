use cashier_types::{Transaction, TransactionState};

use crate::repositories::transaction::TransactionRepository;

use super::action::ActionService;

pub mod has_dependency;
pub mod icrc_112;
// pub mod update_tx_state;

pub struct TransactionService {
    transaction_repository: TransactionRepository,
    action_service: ActionService,
}

impl TransactionService {
    pub fn new(
        transaction_repository: TransactionRepository,
        action_service: ActionService,
    ) -> Self {
        Self {
            transaction_repository,
            action_service,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(TransactionRepository::new(), ActionService::get_instance())
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

        self.transaction_repository.update(tx.clone());

        self.action_service
            .roll_up_state(tx.id.clone())
            .map_err(|e| format!("roll_up_state failed: {}", e))?;

        Ok(())
    }
}
