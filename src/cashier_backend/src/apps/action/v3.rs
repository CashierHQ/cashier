// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::v3::ActionV3, action_intent::v1::ActionIntent, intent::v3::IntentV3,
        intent_transaction::v1::IntentTransaction, link::v3::LinkV3, link_action::v1::LinkAction,
        transaction::v1::Transaction, user_action::v1::UserAction,
    },
};
use cashier_shared::types::Action as ActionShared;
use std::collections::HashMap;
use uuid::Uuid;

use crate::repositories::{self, Repositories};

pub struct ActionServiceV3<R: Repositories> {
    // Concrete repository implementations
    action_repository: repositories::action::v3::ActionV3Repository<R::ActionV3>,
    intent_repository: repositories::intent::v3::IntentV3Repository<R::IntentV3>,
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

impl<R: Repositories> ActionServiceV3<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            action_repository: repo.action_v3(),
            intent_repository: repo.intent_v3(),
            action_intent_repository: repo.action_intent(),
            transaction_repository: repo.transaction(),
            intent_transaction_repository: repo.intent_transaction(),
            link_action_repository: repo.link_action(),
            user_action_repository: repo.user_action(),
            user_link_action_repository: repo.user_link_action(),
        }
    }

    /// Creates an ActionV3 model from shared action data.
    /// # Arguments
    /// * `action` - The shared action data
    /// * `link_id` - Optional link ID associated with the action
    /// * `creator` - The principal of the action creator
    /// # Returns
    /// * `ActionV3` - The created ActionV3 model
    pub fn create_action_from_shared_data(
        &self,
        action: ActionShared,
        link_id: Option<String>,
        creator: Principal,
    ) -> ActionV3 {
        let action_id = Uuid::new_v4().to_string();
        let mut action_model = ActionV3::from(action);
        action_model.id = action_id.clone();
        action_model.creator = creator;
        action_model.link_id = link_id;
        action_model
    }

    /// Stores action-related data into the database.
    /// # Arguments
    /// * `link_action` - The LinkAction model to store
    /// * `action` - The ActionV3 model to store
    /// * `intents` - The list of IntentV3 models to store
    /// * `intent_txs_map` - A map of intent IDs to their associated transactions
    /// * `user_id` - The principal of the user associated with the action
    /// # Returns
    /// * `Result<(), CanisterError>` - Ok if successful, otherwise an error
    pub fn store_action_data(
        &mut self,
        link_action: LinkAction,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
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

        for (intent_id, txs) in intent_txs_map {
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

        self.link_action_repository.create(link_action.clone());
        self.user_action_repository.create(user_action);
        self.action_repository.create(action);
        self.action_intent_repository.batch_create(action_intents);
        self.intent_repository.batch_create(intents);
        self.intent_transaction_repository
            .batch_create(intent_transactions);
        self.transaction_repository.batch_create(transactions);
        self.user_link_action_repository.create(link_action);

        Ok(())
    }
}
