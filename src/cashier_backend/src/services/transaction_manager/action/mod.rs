use std::{collections::HashMap, str::FromStr};

use cashier_types::{
    Action, ActionIntent, ActionState, ActionType, Intent, IntentState, IntentTransaction,
    LinkAction, Transaction, TransactionState, UserAction,
};
use uuid::Uuid;

use crate::{
    core::action::types::{ActionDto, CreateActionInput},
    repositories::{self},
    types::{error::CanisterError, transaction_manager::ActionResp},
    utils::runtime::IcEnvironment,
};

use super::{
    action_adapter::{self, ConvertToIntentInput},
    intent_adapter,
    validate::ValidateService,
};

#[cfg_attr(test, faux::create)]
pub struct ActionService<E: IcEnvironment + Clone> {
    action_repository: repositories::action::ActionRepository,
    intent_repository: repositories::intent::IntentRepository,
    action_intent_repository: repositories::action_intent::ActionIntentRepository,
    transaction_repository: repositories::transaction::TransactionRepository,
    intent_transaction_repository: repositories::intent_transaction::IntentTransactionRepository,
    link_repository: repositories::link::LinkRepository,
    link_action_repository: repositories::link_action::LinkActionRepository,
    user_action_repository: repositories::user_action::UserActionRepository,
    user_wallet_repository: repositories::user_wallet::UserWalletRepository,
    validate_service: ValidateService,
    ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> ActionService<E> {
    pub fn get_instance() -> Self {
        Self {
            action_repository: repositories::action::ActionRepository::new(),
            intent_repository: repositories::intent::IntentRepository::new(),
            action_intent_repository: repositories::action_intent::ActionIntentRepository::new(),
            transaction_repository: repositories::transaction::TransactionRepository::new(),
            intent_transaction_repository:
                repositories::intent_transaction::IntentTransactionRepository::new(),
            link_repository: repositories::link::LinkRepository::new(),
            link_action_repository: repositories::link_action::LinkActionRepository::new(),
            user_action_repository: repositories::user_action::UserActionRepository::new(),
            user_wallet_repository: repositories::user_wallet::UserWalletRepository::new(),
            validate_service: ValidateService::get_instance(),
            ic_env: E::new(),
        }
    }

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
        validate_service: ValidateService,
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
            validate_service,
            ic_env,
        }
    }

    pub fn get_action_by_tx_id(&self, tx_id: String) -> Result<ActionResp, String> {
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

        self._get_action_resp(action_id)
    }

    pub fn get(&self, action_id: String) -> Result<ActionResp, String> {
        self._get_action_resp(action_id)
    }

    pub fn get_action_by_id(&self, action_id: String) -> Option<Action> {
        self.action_repository.get(action_id)
    }

    fn _get_action_resp(&self, action_id: String) -> Result<ActionResp, String> {
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

        Ok(ActionResp {
            action,
            intents,
            intent_txs: intent_txs_hashmap,
        })
    }

    pub fn flatten_tx_hashmap(
        &self,
        intent_txs: &HashMap<String, Vec<cashier_types::Transaction>>,
    ) -> Vec<cashier_types::Transaction> {
        let mut txs = vec![];

        for (_, transactions) in intent_txs {
            for tx in transactions {
                txs.push(tx.clone());
            }
        }

        txs
    }

    pub fn roll_up_intent_state(
        &self,
        intents: &mut Vec<cashier_types::Intent>,
        intent_txs: &HashMap<String, Vec<cashier_types::Transaction>>,
    ) -> Result<(), String> {
        for intent in intents {
            if let Some(transactions) = intent_txs.get(&intent.id) {
                if transactions
                    .iter()
                    .all(|tx| tx.state == TransactionState::Created)
                {
                    intent.state = IntentState::Created;
                } else if transactions
                    .iter()
                    .any(|tx| tx.state == TransactionState::Fail)
                {
                    intent.state = IntentState::Fail;
                } else if transactions
                    .iter()
                    .all(|tx| tx.state == TransactionState::Success)
                {
                    intent.state = IntentState::Success;
                } else {
                    intent.state = IntentState::Processing;
                }
            }
        }
        Ok(())
    }

    pub fn roll_up_action_state(
        &self,
        action: &mut cashier_types::Action,
        intents: &Vec<cashier_types::Intent>,
    ) -> Result<(), String> {
        if intents
            .iter()
            .all(|intent| intent.state == IntentState::Created)
        {
            action.state = ActionState::Created;
        } else if intents
            .iter()
            .any(|intent| intent.state == IntentState::Fail)
        {
            action.state = ActionState::Fail;
        } else if intents
            .iter()
            .all(|intent| intent.state == IntentState::Success)
        {
            action.state = ActionState::Success;
        } else {
            action.state = ActionState::Processing;
        }
        Ok(())
    }

    pub fn roll_up_state(&self, tx_id: String) -> Result<ActionResp, String> {
        let action_resp = self
            .get_action_by_tx_id(tx_id)
            .map_err(|e| format!("get_action_by_tx_id failed: {}", e))?;

        let mut intents = action_resp.intents;
        let intent_txs = action_resp.intent_txs;
        let mut action = action_resp.action;

        self.roll_up_intent_state(&mut intents, &intent_txs)?;
        self.roll_up_action_state(&mut action, &intents)?;

        for intent in intents.clone() {
            self.intent_repository.update(intent.clone());
        }

        self.action_repository.update(action.clone());

        Ok(ActionResp {
            action,
            intents,
            intent_txs,
        })
    }

    // TODO: handle the params for the action incase claim action
    pub async fn create_link_action(
        &self,
        input: CreateActionInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();
        let link = self
            .link_repository
            .get(&input.link_id)
            .ok_or_else(|| CanisterError::ValidationErrors("Link not found".to_string()))?;

        // Validate the user's balance
        match self
            .validate_service
            .validate_balance_with_asset_info(&link.clone(), &caller)
            .await
        {
            Ok(_) => (),
            Err(e) => return Err(CanisterError::ValidationErrors(e)),
        }

        // Get the user ID from the user wallet store
        let user_wallet = self
            .user_wallet_repository
            .get(&caller.to_text())
            .ok_or_else(|| CanisterError::ValidationErrors("User wallet not found".to_string()))?;

        // Parse the intent typex
        let action_type = ActionType::from_str(&input.action_type)
            .map_err(|_| CanisterError::ValidationErrors(format!("Invalid inteactionnt type ")))?;

        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: action_type,
            state: ActionState::Created,
            creator: user_wallet.user_id.clone(),
            link_id: input.link_id.clone(),
        };

        let link_action = LinkAction {
            link_id: link.id.clone(),
            action_type: input.action_type.clone(),
            action_id: action.id.clone(),
        };

        let create_intent_input = ConvertToIntentInput {
            action: action.clone(),
            link: link.clone(),
        };

        let adapter: action_adapter::ic_adapter::IcAdapter<E> =
            action_adapter::ic_adapter::IcAdapter::new(&self.ic_env);

        let intents = adapter
            .convert(create_intent_input)
            .map_err(|e| {
                CanisterError::ValidationErrors(format!(
                    "Failed to convert action to intent: {}",
                    e
                ))
            })
            .map_err(|e| {
                CanisterError::ValidationErrors(format!(
                    "Failed to convert action to intent: {:?}",
                    e
                ))
            })?;

        let mut intent_tx_hashmap: HashMap<String, Vec<Transaction>> = HashMap::new();

        let intent_adapter = intent_adapter::ic_adapter::IcAdapter::new(&self.ic_env);

        for intent in intents.clone() {
            let transactions = intent_adapter
                .convert(&intent)
                .map_err(|e| {
                    CanisterError::ValidationErrors(format!(
                        "Failed to convert intent to transaction: {}",
                        e
                    ))
                })
                .map_err(|e| {
                    CanisterError::ValidationErrors(format!(
                        "Failed to convert intent to transaction: {:?}",
                        e
                    ))
                })?;

            intent_tx_hashmap.insert(intent.id.clone(), transactions);
        }

        let _ = self.store_action_records(
            link_action,
            action.clone(),
            intents.clone(),
            intent_tx_hashmap,
            user_wallet.user_id.clone(),
        )?;

        Ok(ActionDto::from(action, intents))

        // Retrieve and return the created intent
    }

    pub fn store_action_records(
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
