use cashier_types::{Transaction, TransactionState};
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    core::action::types::ActionDto,
    services::transaction_manager::{TransactionManagerService, UpdateActionArgs},
    types::{error::CanisterError, transaction_manager::ActionData},
    utils::{self, helper::to_subaccount, runtime::IcEnvironment},
};

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub async fn update_action(&self, args: UpdateActionArgs) -> Result<ActionDto, CanisterError> {
        let action_data = self
            .action_service
            .get_action_data(args.action_id.clone())
            .map_err(|e| CanisterError::NotFound(e))?;

        let txs = utils::collections::flatten_hashmap_values(&action_data.intent_txs);

        // manually check the status of the tx of the action
        // update status to whaterver is returned by the manual check
        for mut tx in txs.clone() {
            let new_state = self.manual_check_status(&tx, txs.clone()).await?;
            if tx.state == new_state.clone() {
                continue;
            }

            self.update_tx_state(&mut tx, &new_state)?
        }

        let mut request = None;

        // check which tx are eligible to be executed
        // if tx has dependent txs, that need to be completed before executing it, it is not eligible
        // if all the dependent txs were complete, it is eligible to be executed
        // There are additional conditions (handled in has_dependency method below):
        // - if tx is grouped into a batch ICRC-112, dependency between txs in the batch is ignored during eligibility check
        // - if tx is gropued into a batch ICRC-112, tx is only eligible if all other tx in batch have no dependencies (so that al txs can be executed in batch together)
        // - if execute_wallet_tx = fase, all tx grouped into a batach ICRC-112 are not eligible. client calls update_action with this arg to relay ICRC-112 reponse to tx manager, so we don't want to execute wallet tx again.
        let all_txs = match self.action_service.get_action_data(args.action_id.clone()) {
            Ok(action_data) => utils::collections::flatten_hashmap_values(&action_data.intent_txs),
            Err(e) => {
                return Err(CanisterError::InvalidDataError(e));
            }
        };

        // User wallet account
        let caller = Account {
            owner: self.ic_env.caller(),
            subaccount: None,
        };

        // Link Vault account
        let link_vault = Account {
            owner: self.ic_env.id(),
            subaccount: Some(to_subaccount(&args.link_id.clone())),
        };

        // Directly identify eligible transactions while separating by type
        let mut eligible_wallet_txs: Vec<Transaction> = Vec::new();
        let mut eligible_canister_txs: Vec<Transaction> = Vec::new();

        for tx in all_txs.iter() {
            // Skip transactions that aren't in Created or Failed state
            if tx.state != TransactionState::Created && tx.state != TransactionState::Fail {
                continue;
            }

            // Check if tx has dependencies that need to be completed first
            let has_dependency = match self.has_dependency(tx.id.clone()).await {
                Ok(has_dep) => has_dep,
                Err(e) => return Err(e),
            };

            // Skip transactions with unresolved dependencies
            if has_dependency {
                continue;
            }

            // Transaction is eligible, categorize it based on from_account
            let from_account = match tx.try_get_from_account() {
                Ok(account) => account,
                Err(e) => return Err(CanisterError::InvalidDataError(e.to_string())),
            };

            if from_account == caller {
                eligible_wallet_txs.push(tx.clone());
            } else if from_account == link_vault {
                eligible_canister_txs.push(tx.clone());
            }
            // Right now there is no tx have from_account is neither caller nor link_vault, so we don't need to handle this case
        }

        // only for ic actions
        if !args.execute_wallet_tx {
            // With the txs that were grouped into a batch, we assemble a icrc_112 request
            let icrc_112_requests = self.create_icrc_112(
                &caller,
                &args.action_id,
                &args.link_id,
                &eligible_wallet_txs,
            )?;

            request = if icrc_112_requests.is_none() {
                None
            } else if icrc_112_requests.as_ref().unwrap().len() == 0 {
                None
            } else {
                Some(icrc_112_requests.unwrap())
            };

            // We execute transactions

            // Wallet tx are executed by the client, when it receives the ICRC-112 request this method returns
            // and tx status is 'processing' until client updates tx manager with response of ICRC-112
            for mut tx in eligible_wallet_txs {
                self.execute_tx(&mut tx).await.map_err(|e| {
                    CanisterError::HandleLogicError(format!("Error executing tx: {}", e))
                })?;
            }

            // Canister tx are executed here directly and tx status is updated to 'success' or 'fail' right away
            for mut tx in eligible_canister_txs {
                self.execute_tx(&mut tx).await.map_err(|e| {
                    CanisterError::HandleLogicError(format!("Error executing tx: {}", e))
                })?;

                // this method update the tx state to success or fail inside of it
                self.execute_canister_tx(&mut tx).await?;
            }
        }

        let get_resp: ActionData = self
            .action_service
            .get_action_data(args.action_id.clone())
            .map_err(|e| CanisterError::InvalidDataError(format!("Error getting action: {}", e)))?;

        Ok(ActionDto::build(
            get_resp.action,
            get_resp.intents,
            get_resp.intent_txs,
            request,
        ))
    }
}
