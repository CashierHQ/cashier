use std::collections::HashMap;

use crate::{
    domains::action::ActionDomainLogic,
    info,
    repositories::{self},
    types::{error::CanisterError, transaction_manager::ActionData},
    utils::runtime::IcEnvironment,
};
use cashier_types::{
    Action, ActionIntent, Intent, IntentTransaction, LinkAction, Transaction, UserAction,
};

// Without traits/interfaces for repositories
pub struct ActionService<E: IcEnvironment + Clone> {
    // Concrete repository implementations
    action_repository: repositories::action::ActionRepository,
    intent_repository: repositories::intent::IntentRepository,
    action_intent_repository: repositories::action_intent::ActionIntentRepository,
    transaction_repository: repositories::transaction::TransactionRepository,
    intent_transaction_repository: repositories::intent_transaction::IntentTransactionRepository,
    link_repository: repositories::link::LinkRepository,
    link_action_repository: repositories::link_action::LinkActionRepository,
    user_action_repository: repositories::user_action::UserActionRepository,
    user_wallet_repository: repositories::user_wallet::UserWalletRepository,

    // Domain logic
    domain_logic: ActionDomainLogic,
    ic_env: E,
}

// Implementation of the service cordinates the repositories and domain logic
impl<E> ActionService<E>
where
    E: IcEnvironment + Clone,
{
    pub fn new(
        action_repository: repositories::action::ActionRepository,
        intent_repository: repositories::intent::IntentRepository,
        action_intent_repository: repositories::action_intent::ActionIntentRepository,
        transaction_repository: repositories::transaction::TransactionRepository,
        intent_transaction_repository: repositories::intent_transaction::IntentTransactionRepository,
        link_repository: repositories::link::LinkRepository,
        link_action_repository: repositories::link_action::LinkActionRepository,
        user_action_repository: repositories::user_action::UserActionRepository,
        user_wallet_repository: repositories::user_wallet::UserWalletRepository,
        ic_env: E,
    ) -> Self {
        Self {
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
            domain_logic: ActionDomainLogic::new(),
            ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            repositories::action::ActionRepository::new(),
            repositories::intent::IntentRepository::new(),
            repositories::action_intent::ActionIntentRepository::new(),
            repositories::transaction::TransactionRepository::new(),
            repositories::intent_transaction::IntentTransactionRepository::new(),
            repositories::link::LinkRepository::new(),
            repositories::link_action::LinkActionRepository::new(),
            repositories::user_action::UserActionRepository::new(),
            repositories::user_wallet::UserWalletRepository::new(),
            IcEnvironment::new(),
        )
    }

    pub fn get_action_data(&self, action_id: String) -> Result<ActionData, String> {
        let action = self
            .action_repository
            .get(action_id.clone())
            .ok_or_else(|| "action not found".to_string())?;

        let all_intents = self.action_intent_repository.get_by_action_id(action_id);

        let intents = all_intents
            .iter()
            .map(|action_intent| {
                let intent = self
                    .intent_repository
                    .get(action_intent.intent_id.clone())
                    .unwrap();
                intent
            })
            .collect();

        let mut intent_txs_hashmap = HashMap::new();

        for action_intent in all_intents {
            let intent_transactions = self
                .intent_transaction_repository
                .get_by_intent_id(action_intent.intent_id.clone());

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

    pub fn get_action_by_id(&self, action_id: String) -> Option<Action> {
        self.action_repository.get(action_id)
    }

    pub fn get_action_by_tx_id(&self, tx_id: String) -> Result<ActionData, String> {
        let get_intent_tx_res = self
            .intent_transaction_repository
            .get_by_transaction_id(tx_id);
        let intent_tx_belong = get_intent_tx_res
            .first()
            .ok_or("intent_transaction not found")?;
        let intent_id = intent_tx_belong.intent_id.clone();

        let get_action_intent_res = self.action_intent_repository.get_by_intent_id(intent_id);

        let action_intent = get_action_intent_res
            .first()
            .ok_or("action_intent not found")?;

        let action_id = action_intent.action_id.clone();

        self.get_action_data(action_id)
    }

    pub fn roll_up_state(&self, tx_id: String) -> Result<ActionData, String> {
        let action_data = self
            .get_action_by_tx_id(tx_id)
            .map_err(|e| format!("get_action_by_tx_id failed: {}", e))?;

        let mut intents = action_data.intents;
        let intent_txs = action_data.intent_txs;
        let mut action = action_data.action;

        for intent in &mut intents {
            let txs = intent_txs.get(&intent.id).unwrap();
            let intent_state = self.domain_logic.calculate_intent_state(txs);
            info!(
                "[roll_up_state] intent: {:#?} {:?}",
                intent.id, intent_state
            );

            intent.state = intent_state;
        }

        action.state = self.domain_logic.calculate_action_state(&intents);
        info!(
            "[roll_up_state] action: {:#?} {:?}",
            action.id, action.state
        );

        self.intent_repository.batch_update(intents.clone());
        self.action_repository.update(action.clone());

        Ok(ActionData {
            action,
            intents,
            intent_txs,
        })
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
            user_id: user_id.to_string(),
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
}
