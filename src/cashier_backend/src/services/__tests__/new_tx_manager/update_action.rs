use std::collections::HashMap;

use cashier_types::{ActionState, IntentState, TransactionState};
use uuid::Uuid;

use crate::{
    services::{
        __tests__::{
            fixture::TransactionManagerTestFixture,
            tests::{
                create_dummy_action, create_dummy_intent, create_dummy_transaction,
                create_dummy_tx_protocol, generate_random_principal,
            },
        },
        transaction_manager::{TransactionManagerService, UpdateActionArgs},
    },
    types::transaction_manager::ActionData,
};

#[tokio::test]
async fn should_update_action_successfully_without_tx_execution() {
    // Setup test fixture
    let (transaction_service, mut action_service, mut ic_env, icrc_service, mut ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let action = create_dummy_action(ActionState::Created);
    let intent1 = create_dummy_intent(IntentState::Created);
    let intent2 = create_dummy_intent(IntentState::Created);
    let tx1 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
    let tx2 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
    let link_id = Uuid::new_v4().to_string();
    let caller = generate_random_principal();

    let mut intent_txs = HashMap::new();
    intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
    intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

    let action_data = ActionData {
        action: action.clone(),
        intents: vec![intent1.clone(), intent2.clone()],
        intent_txs: intent_txs.clone(),
    };

    let args = UpdateActionArgs {
        action_id: action.id.clone(),
        link_id: link_id.clone(),
        execute_wallet_tx: false,
    };

    let tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    let result = tx_manager_service.update_action(args);
}

#[tokio::test]
async fn should_update_action_and_execute_canister_transactions() {}

#[tokio::test]
async fn should_handle_transactions_with_dependencies() {}
