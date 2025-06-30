// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories;
use crate::types::transaction_manager::RollUpStateResp;
use crate::{
    domains::action::ActionDomainLogic,
    types::{error::CanisterError, transaction_manager::ActionData},
};
use cashier_types::action::v1::Action;
use cashier_types::link_action::v1::LinkAction;
use cashier_types::user_action::v1::UserAction;
use cashier_types::{
    action_intent::v1::ActionIntent, intent::v2::Intent, intent_transaction::v1::IntentTransaction,
    transaction::v2::Transaction,
};

use std::collections::HashMap;

pub struct ActionService {
    // Concrete repository implementations
    action_repository: repositories::action::ActionRepository,
    intent_repository: repositories::intent::IntentRepository,
    action_intent_repository: repositories::action_intent::ActionIntentRepository,
    transaction_repository: repositories::transaction::TransactionRepository,
    intent_transaction_repository: repositories::intent_transaction::IntentTransactionRepository,
    link_action_repository: repositories::link_action::LinkActionRepository,
    user_action_repository: repositories::user_action::UserActionRepository,

    // Domain logic
    domain_logic: ActionDomainLogic,
}

impl ActionService {
    pub fn new(
        action_repository: repositories::action::ActionRepository,
        intent_repository: repositories::intent::IntentRepository,
        action_intent_repository: repositories::action_intent::ActionIntentRepository,
        transaction_repository: repositories::transaction::TransactionRepository,
        intent_transaction_repository: repositories::intent_transaction::IntentTransactionRepository,
        link_action_repository: repositories::link_action::LinkActionRepository,
        user_action_repository: repositories::user_action::UserActionRepository,
    ) -> Self {
        Self {
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_action_repository,
            user_action_repository,
            domain_logic: ActionDomainLogic::new(),
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            repositories::action::ActionRepository::new(),
            repositories::intent::IntentRepository::new(),
            repositories::action_intent::ActionIntentRepository::new(),
            repositories::transaction::TransactionRepository::new(),
            repositories::intent_transaction::IntentTransactionRepository::new(),
            repositories::link_action::LinkActionRepository::new(),
            repositories::user_action::UserActionRepository::new(),
        )
    }

    pub fn get_action_data(&self, action_id: &str) -> Result<ActionData, String> {
        let action = self
            .action_repository
            .get(action_id)
            .ok_or_else(|| "action not found".to_string())?;

        let all_intents = self.action_intent_repository.get_by_action_id(&action_id);

        let intents: Vec<Intent> = all_intents
            .iter()
            .map(|ai| {
                self.intent_repository
                    .get(&ai.intent_id)
                    .ok_or_else(|| format!("intent not found: {}", ai.intent_id))
            })
            .collect::<Result<_, _>>()?;

        let mut intent_txs_hashmap = HashMap::new();

        for action_intent in all_intents {
            let intent_transactions = self
                .intent_transaction_repository
                .get_by_intent_id(&action_intent.intent_id);

            let mut txs = vec![];
            for intent_tx in intent_transactions {
                let tx = self
                    .transaction_repository
                    .get(&intent_tx.transaction_id.clone())
                    .ok_or_else(|| "transaction not found".to_string())?;
                txs.push(tx);
            }

            intent_txs_hashmap.insert(action_intent.intent_id, txs);
        }

        Ok(ActionData {
            action,
            intents,
            intent_txs: intent_txs_hashmap,
        })
    }

    pub fn get_action_by_id(&self, action_id: &str) -> Option<Action> {
        self.action_repository.get(action_id)
    }

    pub fn get_action_by_tx_id(&self, tx_id: &str) -> Result<ActionData, String> {
        let get_intent_tx_res = self
            .intent_transaction_repository
            .get_by_transaction_id(tx_id);
        let intent_tx_belong = get_intent_tx_res
            .first()
            .ok_or("intent_transaction not found")?;
        let intent_id = intent_tx_belong.intent_id.clone();

        let get_action_intent_res = self.action_intent_repository.get_by_intent_id(&intent_id);

        let action_intent = get_action_intent_res
            .first()
            .ok_or("action_intent not found")?;

        self.get_action_data(&action_intent.action_id)
    }

    /// Rolls up and updates the state of an action and its associated intents based on a given transaction ID.
    ///
    /// This method:
    /// 1. Retrieves the action data associated with the given transaction ID
    /// 2. Updates the state of each intent based on its transactions
    /// 3. Updates the overall action state based on the updated intents
    /// 4. Persists these state changes to the repositories
    /// 5. Returns both the updated action data and the previous state
    ///
    /// # Parameters
    /// * `tx_id` - Transaction ID used to lookup the associated action
    ///
    /// # Returns
    /// * `Ok(RollUpStateResp)` - Contains the updated action data and previous state
    /// * `Err(String)` - Error message if any step in the process fails
    ///
    /// # State Changes
    /// - Updates intent states in the intent repository
    /// - Updates action state in the action repository
    pub fn roll_up_state(&self, tx_id: &str) -> Result<RollUpStateResp, String> {
        let action_data = self
            .get_action_by_tx_id(tx_id)
            .map_err(|e| format!("get_action_by_tx_id failed: {}", e))?;

        let previous_state = action_data.action.state.clone();

        let mut intents = action_data.intents;
        let intent_txs = action_data.intent_txs;
        let mut action = action_data.action;

        for intent in &mut intents {
            let txs = intent_txs
                .get(&intent.id)
                .ok_or_else(|| format!("intent_txs not found for intent: {}", intent.id))?;
            let intent_state = self.domain_logic.roll_up_intent_state(txs);
            intent.state = intent_state;
        }

        action.state = self.domain_logic.roll_up_action_state(&intents);

        self.intent_repository.batch_update(intents.clone());
        self.action_repository.update(action.clone());

        let updated_action_data = ActionData {
            action,
            intents,
            intent_txs,
        };

        // Return response with both previous and current states
        Ok(RollUpStateResp::from((updated_action_data, previous_state)))
    }

    pub fn store_action_data(
        &self,
        link_action: LinkAction,
        action: Action,
        intents: Vec<Intent>,
        intent_tx_map: HashMap<String, Vec<Transaction>>,
        user_id: String,
    ) -> Result<(), CanisterError> {
        let action_intents = intents
            .iter()
            .map(|intent| ActionIntent {
                action_id: action.id.clone(),
                intent_id: intent.id.clone(),
            })
            .collect::<Vec<ActionIntent>>();

        let mut intent_transactions: Vec<IntentTransaction> = vec![];
        let mut transactions: Vec<Transaction> = vec![];

        for (intent_id, txs) in intent_tx_map {
            for tx in txs {
                let intent_transaction = IntentTransaction {
                    intent_id: intent_id.clone(),
                    transaction_id: tx.id.clone(),
                };

                intent_transactions.push(intent_transaction);
                transactions.push(tx);
            }
        }

        let user_action = UserAction {
            user_id,
            action_id: action.id.clone(),
        };

        self.link_action_repository.create(link_action);
        self.user_action_repository.create(user_action);
        self.action_repository.create(action);
        self.action_intent_repository.batch_create(action_intents);
        self.intent_repository.batch_create(intents);
        self.intent_transaction_repository
            .batch_create(intent_transactions);
        self.transaction_repository.batch_create(transactions);

        Ok(())
    }

    pub fn get_intents_by_action_id(&self, action_id: &str) -> Vec<Intent> {
        let action_intent_reposiroty = repositories::action_intent::ActionIntentRepository::new();
        let intent_repository = repositories::intent::IntentRepository::new();
        let action_intents = action_intent_reposiroty.get_by_action_id(action_id);

        let intent_ids = action_intents
            .iter()
            .map(|action_intent| action_intent.intent_id.clone())
            .collect();

        intent_repository.batch_get(intent_ids)
    }
}
