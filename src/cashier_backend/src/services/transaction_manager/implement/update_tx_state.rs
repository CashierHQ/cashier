use cashier_types::{Transaction, TransactionState};

use crate::{
    info, services::transaction_manager::TransactionManagerService, types::error::CanisterError,
    utils::runtime::IcEnvironment,
};

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn update_tx_state(
        &self,
        tx: &mut Transaction,
        state: &TransactionState,
    ) -> Result<(), CanisterError> {
        info!(
            "Updating tx {} state from {:?} to {:?}",
            tx.id.clone(),
            tx.state.clone(),
            state.clone()
        );
        // update tx state
        self.transaction_service.update_tx_state(tx, state)?;
        // roll up
        self.action_service
            .roll_up_state(tx.id.clone())
            .map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Failed to roll up state for action: {}",
                    e
                ))
            })?;

        Ok(())
    }
}
