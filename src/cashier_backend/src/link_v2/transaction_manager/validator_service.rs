use std::{collections::HashMap, rc::Rc};

use cashier_backend_types::{
    error::CanisterError,
    link_v2::{
        graph::Graph,
        transaction_manager::{RollupActionStateResult, ValidateActionTransactionsResult},
    },
    repository::{
        action::v1::{Action, ActionState},
        intent::v1::{Intent, IntentState},
        transaction::v1::{FromCallType, Transaction, TransactionState},
    },
};

use crate::link_v2::{
    transaction::traits::TransactionValidator,
    transaction_manager::topological_sort::kahn_topological_sort_flat,
};

pub struct ValidatorService<V: TransactionValidator> {
    validator: Rc<V>,
}

impl<V: TransactionValidator> ValidatorService<V> {
    pub fn new(validator: Rc<V>) -> Self {
        Self { validator }
    }

    pub async fn validate_action_transactions(
        &self,
        transactions: &[Transaction],
    ) -> Result<ValidateActionTransactionsResult, CanisterError> {
        let mut wallet_transactions = Vec::<Transaction>::new();
        let mut canister_transactions = Vec::<Transaction>::new();
        let mut errors = Vec::<String>::new();

        let mut txs_map: HashMap<String, Transaction> = transactions
            .iter()
            .map(|tx| (tx.id.clone(), tx.clone()))
            .collect();

        // topologically sort transactions
        let graph: Graph = transactions.to_vec().into();
        let sorted_transactions = kahn_topological_sort_flat(&graph)?;

        // validate transactions in topological order and update their status
        let mut is_success = true;
        for tx_id in sorted_transactions.iter() {
            if let Some(tx) = txs_map.get_mut(tx_id) {
                if tx.from_call_type == FromCallType::Canister {
                    // Skip validation for canister-initiated transactions
                    canister_transactions.push(tx.clone());
                    continue;
                }

                match self.validator.validate_success(tx.clone()).await {
                    Ok(_) => tx.state = TransactionState::Success,
                    Err(e) => {
                        tx.state = TransactionState::Fail;
                        errors.push(e);
                        is_success = false;
                    }
                }
                wallet_transactions.push(tx.clone());
            }
        }

        Ok(ValidateActionTransactionsResult {
            wallet_transactions,
            canister_transactions,
            is_success,
            errors,
        })
    }

    pub fn rollup_action_state(
        &self,
        action: Action,
        intents: &[Intent],
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<RollupActionStateResult, CanisterError> {
        // rollup intent state from its transactions state
        let mut updated_intents = Vec::<Intent>::new();
        for intent in intents.iter() {
            let mut updated_intent = intent.clone();
            if let Some(txs) = intent_txs_map.get(&intent.id) {
                let all_success = txs.iter().all(|tx| tx.state == TransactionState::Success);
                let any_fail = txs.iter().any(|tx| tx.state == TransactionState::Fail);

                if all_success {
                    updated_intent.state = IntentState::Success;
                } else if any_fail {
                    updated_intent.state = IntentState::Fail;
                }
            }
            updated_intents.push(updated_intent);
        }

        // rollup action state from its intents state
        let mut updated_action = action;
        let all_intent_success = updated_intents
            .iter()
            .all(|intent| intent.state == IntentState::Success);
        let any_intent_fail = updated_intents
            .iter()
            .any(|intent| intent.state == IntentState::Fail);

        if all_intent_success {
            updated_action.state = ActionState::Success;
        } else if any_intent_fail {
            updated_action.state = ActionState::Fail;
        }

        Ok(RollupActionStateResult {
            action: updated_action,
            intents: updated_intents,
            intent_txs_map,
        })
    }
}
