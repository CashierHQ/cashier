use cashier_types::Transaction;
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    services::transaction_manager::TransactionManagerService,
    types::{error::CanisterError, icrc_112_transaction::Icrc112Requests},
    utils::runtime::IcEnvironment,
};

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn create_icrc_112(
        &self,
        caller: &Account,
        action_id: &str,
        link_id: &str,
        txs: &Vec<Transaction>,
    ) -> Result<Option<Icrc112Requests>, CanisterError> {
        let mut tx_execute_from_user_wallet = vec![];

        for tx in txs {
            let from_account = tx
                .try_get_from_account()
                .map_err(|e| CanisterError::InvalidDataError(e.to_string()))?;
            // check from_account is caller or not
            if from_account == *caller {
                tx_execute_from_user_wallet.push(tx.clone());
            }
        }

        Ok(self.transaction_service.create_icrc_112(
            action_id,
            link_id,
            &tx_execute_from_user_wallet,
        ))
    }
}
