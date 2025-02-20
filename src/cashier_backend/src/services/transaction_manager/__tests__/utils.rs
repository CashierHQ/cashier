use std::collections::HashMap;

use crate::repositories::{
    action::ActionRepository, action_intent::ActionIntentRepository, intent::IntentRepository,
    intent_transaction::IntentTransactionRepository, transaction::TransactionRepository,
};

use cashier_types::{
    Action, ActionIntent, ActionState, Intent, IntentState, IntentTransaction, Transaction,
    TransactionState,
};
use fake::{Fake, Faker};
use uuid::Uuid;

fn create_dummy_intent(state: IntentState) -> Intent {
    Intent {
        id: Uuid::new_v4().to_string(),
        state,
        created_at: Faker.fake(),
        dependency: vec![Faker.fake(), Faker.fake()],
        chain: Faker.fake(),
        task: Faker.fake(),
        r#type: Faker.fake(),
    }
}

fn create_dummy_transaction(state: TransactionState) -> Transaction {
    Transaction {
        id: Uuid::new_v4().to_string(),
        created_at: Faker.fake(),
        state,
        dependency: Some(vec![Faker.fake(), Faker.fake()]),
        group: Some(Faker.fake()),
        from_call_type: Faker.fake(),
        protocol: Faker.fake(),
        start_ts: Some(Faker.fake()),
    }
}

fn create_dummy_action(state: ActionState) -> Action {
    Action {
        id: Uuid::new_v4().to_string(),
        r#type: Faker.fake(),
        state,
        creator: Faker.fake(),
    }
}

fn generate_action_and_intents(
    num_intents: Option<usize>,
    intent_state: Option<IntentState>,
    exclude_states: Option<Vec<IntentState>>,
    action_state: ActionState,
) -> (Action, Vec<Intent>, Vec<ActionIntent>) {
    let num_intents = num_intents.unwrap_or(2);
    let intent_state = intent_state.unwrap_or(IntentState::Created);

    let mock_action: Action = create_dummy_action(action_state);

    let mut intents = Vec::new();
    let mut action_intents = Vec::new();

    for _ in 0..num_intents {
        let state = if let Some(ref exclude) = exclude_states {
            let mut state = intent_state.clone();
            while exclude.contains(&state) {
                state = Faker.fake();
            }
            state
        } else {
            intent_state.clone()
        };

        let mock_intent = create_dummy_intent(state);
        intents.push(mock_intent.clone());
        action_intents.push(ActionIntent {
            action_id: mock_action.id.clone(),
            intent_id: mock_intent.id.clone(),
        });
    }

    (mock_action, intents, action_intents)
}
fn generate_intents_and_txs(
    intent: &Intent,
    num_txs: Option<usize>,
    tx_state: Option<TransactionState>,
    exclude_states: Option<Vec<TransactionState>>,
    ensure_failed_tx: bool,
) -> (Vec<IntentTransaction>, Vec<Transaction>) {
    let num_txs = num_txs.unwrap_or(2);

    let mut txs = Vec::new();
    let mut intent_txs = Vec::new();
    let mut has_failed_tx = false;

    for _ in 0..num_txs {
        let state = match tx_state.clone() {
            Some(s) => s.clone(),
            None => {
                if let Some(ref exclude) = exclude_states {
                    let mut state = Faker.fake();
                    while exclude.contains(&state) {
                        state = Faker.fake();
                    }
                    state
                } else {
                    Faker.fake()
                }
            }
        };

        let mock_transaction = create_dummy_transaction(state.clone());
        txs.push(mock_transaction.clone());
        intent_txs.push(IntentTransaction {
            intent_id: intent.id.clone(),
            transaction_id: mock_transaction.id.clone(),
        });

        if state == TransactionState::Fail {
            has_failed_tx = true;
        }
    }
    if ensure_failed_tx && !has_failed_tx {
        let failed_tx = create_dummy_transaction(TransactionState::Fail);
        txs.push(failed_tx.clone());
        intent_txs.push(IntentTransaction {
            intent_id: intent.id.clone(),
            transaction_id: failed_tx.id.clone(),
        });
    }

    (intent_txs, txs)
}

pub fn generate_action_with_for_processing() -> (
    Action,
    Vec<Intent>,
    Vec<ActionIntent>,
    HashMap<String, Vec<Transaction>>,
    HashMap<String, Vec<IntentTransaction>>,
    HashMap<String, Transaction>,
) {
    let (mock_action, intents, mock_action_intents) = generate_action_and_intents(
        None,
        Some(IntentState::Processing),
        Some(vec![IntentState::Fail]),
        ActionState::Processing,
    );

    let mut intent_id_txs_hash_map: HashMap<String, Vec<Transaction>> = HashMap::new();
    let mut intent_transaction_hash_map: HashMap<String, Vec<IntentTransaction>> = HashMap::new();
    let mut txs_hash_map: HashMap<String, Transaction> = HashMap::new();

    for intent in &intents {
        let (intent_txs, txs) = generate_intents_and_txs(
            intent,
            None,
            None,
            Some(vec![TransactionState::Fail]),
            false,
        );
        for tx in &txs {
            txs_hash_map.insert(tx.id.clone(), tx.clone());
        }
        intent_id_txs_hash_map.insert(intent.id.clone(), txs);
        intent_transaction_hash_map.insert(intent.id.clone(), intent_txs);
    }

    (
        mock_action,
        intents,
        mock_action_intents,
        intent_id_txs_hash_map,
        intent_transaction_hash_map,
        txs_hash_map,
    )
}

pub fn generate_action_with_for_fail() -> (
    Action,
    Vec<Intent>,
    Vec<ActionIntent>,
    HashMap<String, Vec<Transaction>>,
    HashMap<String, Vec<IntentTransaction>>,
    HashMap<String, Transaction>,
) {
    let (mock_action, intents, mock_action_intents) = generate_action_and_intents(
        None,
        Some(IntentState::Processing),
        Some(vec![IntentState::Fail]),
        ActionState::Processing,
    );

    let mut intent_id_txs_hash_map: HashMap<String, Vec<Transaction>> = HashMap::new();
    let mut intent_transaction_hash_map: HashMap<String, Vec<IntentTransaction>> = HashMap::new();
    let mut txs_hash_map: HashMap<String, Transaction> = HashMap::new();

    for intent in &intents {
        let (intent_txs, txs) = generate_intents_and_txs(intent, None, None, None, false);
        for tx in &txs {
            txs_hash_map.insert(tx.id.clone(), tx.clone());
        }
        intent_id_txs_hash_map.insert(intent.id.clone(), txs);
        intent_transaction_hash_map.insert(intent.id.clone(), intent_txs);
    }

    (
        mock_action,
        intents,
        mock_action_intents,
        intent_id_txs_hash_map,
        intent_transaction_hash_map,
        txs_hash_map,
    )
}

pub fn generate_mock_action_data(
    action_state: ActionState,
    num_intents: Option<usize>,
    intent_state: Option<IntentState>,
    exclude_intent_states: Option<Vec<IntentState>>,
    num_txs: Option<usize>,
    tx_state: Option<TransactionState>,
    exclude_tx_states: Option<Vec<TransactionState>>,
    ensure_failed_tx: bool,
) -> (
    Action,
    Vec<Intent>,
    Vec<ActionIntent>,
    HashMap<String, Vec<Transaction>>,
    HashMap<String, Vec<IntentTransaction>>,
    HashMap<String, Transaction>,
) {
    let (mock_action, intents, mock_action_intents) = generate_action_and_intents(
        num_intents,
        intent_state,
        exclude_intent_states,
        action_state,
    );

    let mut intent_id_txs_hash_map: HashMap<String, Vec<Transaction>> = HashMap::new();
    let mut intent_transaction_hash_map: HashMap<String, Vec<IntentTransaction>> = HashMap::new();
    let mut txs_hash_map: HashMap<String, Transaction> = HashMap::new();

    for intent in &intents {
        let (intent_txs, txs) = generate_intents_and_txs(
            intent,
            num_txs,
            tx_state.clone(),
            exclude_tx_states.clone(),
            ensure_failed_tx,
        );
        for tx in &txs {
            txs_hash_map.insert(tx.id.clone(), tx.clone());
        }
        intent_id_txs_hash_map.insert(intent.id.clone(), txs);
        intent_transaction_hash_map.insert(intent.id.clone(), intent_txs);
    }

    (
        mock_action,
        intents,
        mock_action_intents,
        intent_id_txs_hash_map,
        intent_transaction_hash_map,
        txs_hash_map,
    )
}

pub fn setup_repositories() -> (
    ActionRepository,
    IntentRepository,
    ActionIntentRepository,
    TransactionRepository,
    IntentTransactionRepository,
) {
    let action_repository = ActionRepository::faux();
    let intent_repository = IntentRepository::faux();
    let action_intent_repository = ActionIntentRepository::faux();
    let transaction_repository = TransactionRepository::faux();
    let intent_transaction_repository = IntentTransactionRepository::faux();

    (
        action_repository,
        intent_repository,
        action_intent_repository,
        transaction_repository,
        intent_transaction_repository,
    )
}
