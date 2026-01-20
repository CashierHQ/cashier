// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::{self, Repositories};
use candid::Principal;
use cashier_backend_types::dto::link::GetLinkOptions;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v2::link_result::LinkProcessActionResult;
use cashier_backend_types::repository::action::v1::{ActionState, ActionType};
use cashier_backend_types::repository::link_action::v1::LinkUserState;
use cashier_backend_types::{
    repository::{
        action::v1::Action, action_intent::v1::ActionIntent, intent::v2::Intent,
        intent_transaction::v1::IntentTransaction, link_action::v1::LinkAction,
        transaction::v1::Transaction, user_action::v1::UserAction,
    },
    service::action::ActionData,
};

use std::collections::HashMap;

pub struct ActionService<R: Repositories> {
    // Concrete repository implementations
    action_repository: repositories::action::ActionRepository<R::Action>,
    intent_repository: repositories::intent::IntentRepository<R::Intent>,
    action_intent_repository: repositories::action_intent::ActionIntentRepository<R::ActionIntent>,
    transaction_repository: repositories::transaction::TransactionRepository<R::Transaction>,
    intent_transaction_repository:
        repositories::intent_transaction::IntentTransactionRepository<R::IntentTransaction>,
    link_action_repository: repositories::link_action::LinkActionRepository<R::LinkAction>,
    user_action_repository: repositories::user_action::UserActionRepository<R::UserAction>,
    user_link_action_repository:
        repositories::user_link_action::UserLinkActionRepository<R::UserLinkAction>,
    // Domain logic
}

impl<R: Repositories> ActionService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            action_repository: repo.action(),
            intent_repository: repo.intent(),
            action_intent_repository: repo.action_intent(),
            transaction_repository: repo.transaction(),
            intent_transaction_repository: repo.intent_transaction(),
            link_action_repository: repo.link_action(),
            user_action_repository: repo.user_action(),
            user_link_action_repository: repo.user_link_action(),
        }
    }

    pub fn get_action_data(&self, action_id: &str) -> Result<ActionData, String> {
        let action = self
            .action_repository
            .get(action_id)
            .ok_or_else(|| "action not found".to_string())?;

        let all_intents = self.action_intent_repository.get_by_action_id(action_id);

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

    /// Stores the action and associated intents and transactions in the database.
    /// # Arguments
    /// * `link_action` - The link action associated with the action
    /// * `action` - The action to be stored
    /// * `intents` - The list of intents associated with the action
    /// * `intent_tx_map` - A map of intent IDs to their associated transactions
    /// * `user_id` - The user ID associated with the action
    /// # Returns
    /// * `Ok(())` - If the storage is successful
    /// * `Err(CanisterError)` - If the storage fails
    pub fn store_action_data(
        &mut self,
        link_action: LinkAction,
        action: Action,
        intents: Vec<Intent>,
        intent_tx_map: HashMap<String, Vec<Transaction>>,
        user_id: Principal,
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

    /// Updates the action and associated intents in the database.
    /// # Arguments
    /// * `action` - The action to be updated
    /// * `intents` - The list of intents associated with the action to be updated
    /// # Returns
    /// * `Ok(())` - If the update is successful
    /// * `Err(CanisterError)` - If the update fails
    pub fn update_action_data(
        &mut self,
        action: Action,
        intents: Vec<Intent>,
        intent_tx_map: &HashMap<String, Vec<Transaction>>,
    ) -> Result<(), CanisterError> {
        self.action_repository.update(action);
        self.intent_repository.batch_update(intents);

        let mut transactions: Vec<Transaction> = vec![];
        for txs in intent_tx_map.values() {
            for tx in txs {
                transactions.push(tx.clone());
            }
        }
        self.transaction_repository.batch_create(transactions);

        Ok(())
    }

    /// Update link user state based on the given link process action result.
    /// # Arguments
    /// * `result` - `LinkProcessActionResult` containing the processed action and link
    /// # Returns
    /// * `()`
    pub fn update_link_user_state(&mut self, result: &LinkProcessActionResult) {
        let action = &result.process_action_result.action;
        if result.process_action_result.is_success
            && matches!(action.r#type, ActionType::Receive | ActionType::Send)
            && action.state == ActionState::Success
        {
            let link_action = LinkAction {
                link_id: result.link.id.clone(),
                action_type: action.r#type.clone(),
                action_id: action.id.clone(),
                user_id: action.creator,
                link_user_state: Some(LinkUserState::Completed),
            };

            self.user_link_action_repository.update(link_action);
        }
    }

    /// Returns the first action for a user and link, optionally filtered by options.
    /// # Arguments
    /// * `caller` - the user principal
    /// * `link_id` - the link identifier
    /// * `options` - optional `GetLinkOptions` (e.g. action_type filter)
    /// # Returns
    /// * `(Option<Action>, Option<LinkUserStateDto>)` - the action (if any) and the link-user state
    pub fn get_first_action(
        &self,
        caller: &Principal,
        link_id: &str,
        options: Option<GetLinkOptions>,
    ) -> (Option<Action>, Option<LinkUserState>) {
        match options {
            Some(opts) => {
                let action_type = opts.action_type;

                let user_link_actions = self
                    .user_link_action_repository
                    .get_actions_by_user_link_and_type(*caller, link_id, &action_type);

                if let Some(actions) = &user_link_actions {
                    if let Some(link_action) = actions.first() {
                        let action = self.get_action_by_id(&link_action.action_id.clone());

                        (action, link_action.link_user_state.clone())
                    } else {
                        (None, None)
                    }
                } else {
                    (None, None)
                }
            }
            None => (None, None),
        }
    }

    /// Validates whether the caller can create a new action based on existing actions.
    /// # Arguments
    /// * `caller` - The principal of the user attempting to create an action
    /// * `link_id` - The ID of the link
    /// * `action_type` - The type of action to be created
    /// # Returns
    /// * `Ok(())` - If the action can be created
    /// * `Err(CanisterError)` - If action creation should be blocked
    /// # Business Rules
    /// * Only one action per user per link (can be change at the future)
    pub fn check_action_exists_for_user(
        &self,
        caller: Principal,
        link_id: &str,
        action_type: &ActionType,
    ) -> Result<(), CanisterError> {
        let existing_actions = self
            .user_link_action_repository
            .get_actions_by_user_link_and_type(caller, link_id, action_type);

        match action_type {
            ActionType::CreateLink
            | ActionType::Withdraw
            | ActionType::Receive
            | ActionType::Send => {
                // Block if ANY action exists for these types
                if existing_actions
                    .as_ref()
                    .map(|actions| !actions.is_empty())
                    .unwrap_or(false)
                {
                    return Err(CanisterError::ValidationErrors(format!(
                        "Action of type {} already exists for this link",
                        action_type
                    )));
                }
            }
        }

        Ok(())
    }
}
