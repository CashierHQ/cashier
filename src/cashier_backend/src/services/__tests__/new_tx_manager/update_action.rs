// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use std::collections::HashMap;

use candid::Principal;
use cashier_types::{ActionState, IntentState, TransactionState};
use faux::when;
use uuid::Uuid;

use crate::{
    services::{
        __tests__::{
            fixture::TransactionManagerTestFixture,
            tests::{
                create_dummy_action, create_dummy_intent, create_dummy_tx_protocol,
                generate_random_principal,
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

    // Setup mocks
    when!(action_service.get_action_data)
        .times(2)
        .then_return(Ok(action_data.clone()));
    when!(ic_env.caller).then_return(caller);
    when!(ic_env.id).then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());

    // when!(transaction_service.create_icrc_112).then_return(Some(vec![
    //     vec![convert_tx_to_dummy_icrc_112_request(&tx1)],
    //     vec![convert_tx_to_dummy_icrc_112_request(&tx2)],
    // ]));

    // Mock transaction state updates
    when!(transaction_service.update_tx_state)
        .times(2)
        .then_return(Ok(()));

    // Mock the status check
    when!(icrc_service.balance_of)
        .times(2)
        .then_return(Ok(tx1.get_amount() + 1000));

    // Create updated action data with Processing state
    let mut updated_action = action.clone();
    let mut updated_intent1 = intent1.clone();
    let mut updated_intent2 = intent2.clone();
    let mut updated_tx1 = tx1.clone();
    let mut updated_tx2 = tx2.clone();

    updated_action.state = ActionState::Processing;
    updated_intent1.state = IntentState::Processing;
    updated_intent2.state = IntentState::Processing;
    updated_tx1.state = TransactionState::Processing;
    updated_tx2.state = TransactionState::Processing;

    let mut updated_intent_txs = HashMap::new();
    updated_intent_txs.insert(updated_intent1.id.clone(), vec![updated_tx1.clone()]);
    updated_intent_txs.insert(updated_intent2.id.clone(), vec![updated_tx2.clone()]);

    let updated_action_data = ActionData {
        action: updated_action.clone(),
        intents: vec![updated_intent1.clone(), updated_intent2.clone()],
        intent_txs: updated_intent_txs.clone(),
    };

    // Create the service under test
    let tx_manager_service_mock = TransactionManagerService::faux();
    let real_tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    when!(tx_manager_service_mock.update_action)
        .then(|args| real_tx_manager_service.update_action(args).aw);

    // Execute the method under test
    let result = real_tx_manager_service.update_action(args).await;

    // Assertions
    assert!(result.is_ok(), "Expected update_action to succeed");

    let action_dto = result.unwrap();
    assert_eq!(action_dto.id, action.id, "Action ID should match");
    assert_eq!(
        action_dto.state,
        ActionState::Processing.to_string(),
        "Action state should be 'Processing'"
    );
    assert_eq!(action_dto.intents.len(), 2, "Should have 2 intents");
    assert!(
        action_dto.icrc_112_requests.is_some(),
        "Should have ICRC-112 requests"
    );

    let requests = action_dto.icrc_112_requests.unwrap();
    assert_eq!(requests.len(), 2, "Should have 2 batches of requests");
    assert_eq!(
        requests[0][0].nonce,
        Some(tx1.id.clone()),
        "First request should be for tx1"
    );
    assert_eq!(
        requests[1][0].nonce,
        Some(tx2.id.clone()),
        "Second request should be for tx2"
    );
}

// #[tokio::test]
// async fn should_update_action_and_execute_canister_transactions() {
//     // Setup test fixture
//     let (transaction_service, mut action_service, mut ic_env, icrc_service, mut ic_intent_adapter) =
//         TransactionManagerTestFixture::setup();

//     // Create mock data
//     let action = create_dummy_action(ActionState::Created);
//     let intent1 = create_dummy_intent(IntentState::Created);
//     let intent2 = create_dummy_intent(IntentState::Created);

//     // Create a wallet transaction
//     let mut tx1 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
//     tx1.from_call_type = FromCallType::Wallet;

//     // Create a canister transaction
//     let mut tx2 = create_dummy_tx_protocol(TransactionState::Created, "icrc1_transfer");
//     tx2.from_call_type = FromCallType::Canister;

//     let link_id = Uuid::new_v4().to_string();
//     let caller = generate_random_principal();
//     let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

//     let mut intent_txs = HashMap::new();
//     intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
//     intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

//     let action_data = ActionData {
//         action: action.clone(),
//         intents: vec![intent1.clone(), intent2.clone()],
//         intent_txs: intent_txs.clone(),
//     };

//     let args = UpdateActionArgs {
//         action_id: action.id.clone(),
//         link_id: link_id.clone(),
//         execute_wallet_tx: false,
//     };

//     // Setup mocks
//     when!(action_service.get_action_by_id).then_return(Some(action_data.clone()));
//     when!(ic_env.time).then_return(generate_timestamp());
//     when!(ic_env.id).then_return(canister_id);

//     // Mock ICRC-112 creation only for the wallet transaction
//     when!(transaction_service.create_icrc_112)
//         .then_return(Some(vec![vec![convert_tx_to_dummy_icrc_112_request(&tx1)]]));

//     // Mock has_dependency to return false (no dependencies)
//     when!(transaction_service.get_tx_by_id)
//         .times(2)
//         .then_return(Ok(tx2.clone()));
//     when!(action_service.get_action_by_tx_id)
//         .times(2)
//         .then_return(Ok(action_data.clone()));
//     when!(transaction_service.batch_get).then_return(Ok(vec![]));

//     // Mock transaction state updates
//     when!(transaction_service.update_tx_state)
//         .times(3)
//         .then_return(Ok(()));

//     // Create updated action data with Processing state
//     let mut updated_action = action.clone();
//     let mut updated_intent1 = intent1.clone();
//     let mut updated_intent2 = intent2.clone();
//     let mut updated_tx1 = tx1.clone();
//     let mut updated_tx2 = tx2.clone();

//     updated_action.state = ActionState::Processing;
//     updated_intent1.state = IntentState::Processing;
//     updated_intent2.state = IntentState::Success; // The canister transaction succeeded
//     updated_tx1.state = TransactionState::Processing;
//     updated_tx2.state = TransactionState::Success; // The canister transaction succeeded

//     let mut updated_intent_txs = HashMap::new();
//     updated_intent_txs.insert(updated_intent1.id.clone(), vec![updated_tx1.clone()]);
//     updated_intent_txs.insert(updated_intent2.id.clone(), vec![updated_tx2.clone()]);

//     let updated_action_data = ActionData {
//         action: updated_action.clone(),
//         intents: vec![updated_intent1.clone(), updated_intent2.clone()],
//         intent_txs: updated_intent_txs.clone(),
//     };

//     when!(action_service.get_action_by_id).then_return(Some(updated_action_data.clone()));
//     when!(action_service.roll_up_state).then_return(Ok(updated_action_data.clone()));

//     // Create the service under test
//     let tx_manager_service = TransactionManagerService::new(
//         transaction_service,
//         action_service,
//         ic_env,
//         icrc_service,
//         ic_intent_adapter,
//     );

//     // Execute the method under test
//     let result = tx_manager_service.update_action(args).await;

//     // Assertions
//     assert!(result.is_ok(), "Expected update_action to succeed");

//     let action_dto = result.unwrap();
//     assert_eq!(action_dto.id, action.id, "Action ID should match");
//     assert_eq!(
//         action_dto.state,
//         ActionState::Processing.to_string(),
//         "Action state should be 'Processing'"
//     );
//     assert_eq!(action_dto.intents.len(), 2, "Should have 2 intents");

//     // First intent (wallet tx) should be Processing
//     assert_eq!(
//         action_dto.intents[0].state,
//         IntentState::Processing.to_string()
//     );
//     assert_eq!(
//         action_dto.intents[0].transactions[0].state,
//         TransactionState::Processing.to_string()
//     );

//     // Second intent (canister tx) should be Success
//     assert_eq!(
//         action_dto.intents[1].state,
//         IntentState::Success.to_string()
//     );
//     assert_eq!(
//         action_dto.intents[1].transactions[0].state,
//         TransactionState::Success.to_string()
//     );

//     // Should have ICRC-112 requests only for the wallet transaction
//     assert!(
//         action_dto.icrc_112_requests.is_some(),
//         "Should have ICRC-112 requests"
//     );
//     let requests = action_dto.icrc_112_requests.unwrap();
//     assert_eq!(requests.len(), 1, "Should have 1 batch of requests");
//     assert_eq!(
//         requests[0][0].nonce,
//         Some(tx1.id.clone()),
//         "Request should be for tx1"
//     );
// }

// #[tokio::test]
// async fn should_handle_transactions_with_dependencies() {
//     // Setup test fixture
//     let (transaction_service, mut action_service, mut ic_env, icrc_service, mut ic_intent_adapter) =
//         TransactionManagerTestFixture::setup();

//     // Create mock data
//     let action = create_dummy_action(ActionState::Created);
//     let intent1 = create_dummy_intent(IntentState::Created);
//     let intent2 = create_dummy_intent(IntentState::Created);

//     // Create transactions with dependencies
//     let mut tx1 = create_dummy_tx_protocol(TransactionState::Created, "icrc2_approve");
//     let mut tx2 = create_dummy_tx_protocol(TransactionState::Created, "icrc2_transfer_from");
//     tx2.dependency = Some(vec![tx1.id.clone()]); // tx2 depends on tx1

//     let link_id = Uuid::new_v4().to_string();
//     let caller = generate_random_principal();

//     let mut intent_txs = HashMap::new();
//     intent_txs.insert(intent1.id.clone(), vec![tx1.clone()]);
//     intent_txs.insert(intent2.id.clone(), vec![tx2.clone()]);

//     let action_data = ActionData {
//         action: action.clone(),
//         intents: vec![intent1.clone(), intent2.clone()],
//         intent_txs: intent_txs.clone(),
//     };

//     let args = UpdateActionArgs {
//         action_id: action.id.clone(),
//         link_id: link_id.clone(),
//         execute_wallet_tx: false,
//     };

//     // Setup mocks
//     when!(action_service.get_action_by_id).then_return(Some(action_data.clone()));
//     when!(ic_env.time).then_return(generate_timestamp());

//     // Mock ICRC-112 creation to include both transactions in specific order
//     when!(transaction_service.create_icrc_112).then_return(Some(vec![
//         vec![convert_tx_to_dummy_icrc_112_request(&tx1)],
//         vec![convert_tx_to_dummy_icrc_112_request(&tx2)],
//     ]));

//     // Mock has_dependency - tx1 has no dependencies, tx2 depends on tx1
//     when!(transaction_service.get_tx_by_id)
//         .with(eq(tx1.id.clone()))
//         .then_return(Ok(tx1.clone()));
//     when!(transaction_service.get_tx_by_id)
//         .with(eq(tx2.id.clone()))
//         .then_return(Ok(tx2.clone()));
//     when!(action_service.get_action_by_tx_id)
//         .times(2)
//         .then_return(Ok(action_data.clone()));

//     // tx1 has no dependencies
//     when!(transaction_service.batch_get)
//         .with(eq(vec![]))
//         .then_return(Ok(vec![]));

//     // tx2 depends on tx1
//     when!(transaction_service.batch_get)
//         .with(eq(vec![tx1.id.clone()]))
//         .then_return(Ok(vec![tx1.clone()]));

//     // Mock transaction state updates
//     when!(transaction_service.update_tx_state)
//         .times(2)
//         .then_return(Ok(()));

//     // Create updated action data with Processing state
//     let mut updated_action = action.clone();
//     let mut updated_intent1 = intent1.clone();
//     let mut updated_intent2 = intent2.clone();
//     let mut updated_tx1 = tx1.clone();
//     let mut updated_tx2 = tx2.clone();

//     updated_action.state = ActionState::Processing;
//     updated_intent1.state = IntentState::Processing;
//     updated_intent2.state = IntentState::Processing;
//     updated_tx1.state = TransactionState::Processing;
//     updated_tx2.state = TransactionState::Processing;

//     let mut updated_intent_txs = HashMap::new();
//     updated_intent_txs.insert(updated_intent1.id.clone(), vec![updated_tx1.clone()]);
//     updated_intent_txs.insert(updated_intent2.id.clone(), vec![updated_tx2.clone()]);

//     let updated_action_data = ActionData {
//         action: updated_action.clone(),
//         intents: vec![updated_intent1.clone(), updated_intent2.clone()],
//         intent_txs: updated_intent_txs.clone(),
//     };

//     when!(action_service.get_action_by_id).then_return(Some(updated_action_data.clone()));
//     when!(action_service.roll_up_state).then_return(Ok(updated_action_data.clone()));

//     // Create the service under test
//     let tx_manager_service = TransactionManagerService::new(
//         transaction_service,
//         action_service,
//         ic_env,
//         icrc_service,
//         ic_intent_adapter,
//     );

//     // Execute the method under test
//     let result = tx_manager_service.update_action(args).await;

//     // Assertions
//     assert!(result.is_ok(), "Expected update_action to succeed");

//     let action_dto = result.unwrap();
//     assert_eq!(action_dto.id, action.id, "Action ID should match");
//     assert_eq!(
//         action_dto.state,
//         ActionState::Processing.to_string(),
//         "Action state should be 'Processing'"
//     );

//     // Both intents should be in Processing state
//     assert_eq!(action_dto.intents.len(), 2, "Should have 2 intents");
//     assert_eq!(
//         action_dto.intents[0].state,
//         IntentState::Processing.to_string()
//     );
//     assert_eq!(
//         action_dto.intents[1].state,
//         IntentState::Processing.to_string()
//     );

//     // Both transactions should be in Processing state
//     assert_eq!(
//         action_dto.intents[0].transactions[0].state,
//         TransactionState::Processing.to_string()
//     );
//     assert_eq!(
//         action_dto.intents[1].transactions[0].state,
//         TransactionState::Processing.to_string()
//     );

//     // Should have ICRC-112 requests in the correct order (tx1 before tx2)
//     assert!(
//         action_dto.icrc_112_requests.is_some(),
//         "Should have ICRC-112 requests"
//     );
//     let requests = action_dto.icrc_112_requests.unwrap();
//     assert_eq!(requests.len(), 2, "Should have 2 batches of requests");
//     assert_eq!(
//         requests[0][0].nonce,
//         Some(tx1.id.clone()),
//         "First request should be for tx1"
//     );
//     assert_eq!(
//         requests[1][0].nonce,
//         Some(tx2.id.clone()),
//         "Second request should be for tx2"
//     );
// }
