use std::collections::HashMap;

use cashier_types::{ActionState, IntentState, TransactionState};

use crate::repositories;

#[derive(Debug, Clone)]
pub struct ActionResp {
    pub action: cashier_types::Action,
    pub intents: Vec<cashier_types::Intent>,
    pub intent_txs: HashMap<String, Vec<cashier_types::Transaction>>,
}

#[cfg_attr(test, faux::create)]
pub struct ActionService {
    action_repository: repositories::action::ActionRepository,
    intent_repository: repositories::intent::IntentRepository,
    action_intent_repository: repositories::action_intent::ActionIntentRepository,
    transaction_repository: repositories::transaction::TransactionRepository,
    intent_transaction_repository: repositories::intent_transaction::IntentTransactionRepository,
}

#[cfg_attr(test, faux::methods)]
impl ActionService {
    pub fn get_instance() -> Self {
        Self {
            action_repository: repositories::action::ActionRepository::new(),
            intent_repository: repositories::intent::IntentRepository::new(),
            action_intent_repository: repositories::action_intent::ActionIntentRepository::new(),
            transaction_repository: repositories::transaction::TransactionRepository::new(),
            intent_transaction_repository:
                repositories::intent_transaction::IntentTransactionRepository::new(),
        }
    }

    pub fn new(
        action_repository: repositories::action::ActionRepository,
        intent_repository: repositories::intent::IntentRepository,
        action_intent_repository: repositories::action_intent::ActionIntentRepository,
        transaction_repository: repositories::transaction::TransactionRepository,
        intent_transaction_repository: repositories::intent_transaction::IntentTransactionRepository,
    ) -> Self {
        Self {
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
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

    pub fn get(&self, action_id: String) -> Option<ActionResp> {
        self._get_action_resp(action_id).ok()
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
}
