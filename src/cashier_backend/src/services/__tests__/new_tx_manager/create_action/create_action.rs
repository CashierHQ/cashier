use candid::Principal;
use cashier_types::{
    ActionState, ActionType, Asset, Chain, FromCallType, IcTransaction, Icrc1Transfer,
    Icrc2Approve, Icrc2TransferFrom, IntentState, IntentTask, IntentType, Protocol, Transaction,
    TransactionState, TransferData, TransferFromData, Wallet,
};
use faux::when;
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    services::{
        __tests__::{
            fixture::TransactionManagerTestFixture,
            tests::{create_dummy_intent, generate_random_principal, generate_timestamp, Dummy},
        },
        transaction_manager::TransactionManagerService,
    },
    types::{error::CanisterError, temp_action::TemporaryAction},
    utils::helper::to_subaccount,
};

#[tokio::test]
async fn test_create_action_with_valid_inputs() {
    // Setup test fixture
    let (transaction_service, mut action_service, mut ic_env, icrc_service, mut ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let action_id = Uuid::new_v4().to_string();
    let link_id = Uuid::new_v4().to_string();
    let creator = generate_random_principal().to_text();
    let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();
    let timestamp = generate_timestamp();

    // Create a wallet-to-link transfer intent
    let mut transfer_intent = create_dummy_intent(IntentState::Created);
    transfer_intent.task = IntentTask::TransferWalletToLink;
    let token_address = "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string();

    let transfer_data = TransferData {
        from: Wallet {
            address: creator.clone(),
            chain: Chain::IC,
        },
        to: Wallet {
            address: Account {
                owner: canister_id.clone(),
                subaccount: Some(to_subaccount(&link_id)),
            }
            .to_string(),
            chain: Chain::IC,
        },
        asset: Asset {
            address: token_address.clone(),
            chain: Chain::IC,
        },
        amount: 1000_0000_0000,
    };
    transfer_intent.r#type = IntentType::Transfer(transfer_data);

    // Create a wallet-to-treasury transfer intent
    let mut fee_intent = create_dummy_intent(IntentState::Created);
    fee_intent.task = IntentTask::TransferWalletToTreasury;
    let fee_transfer_data = TransferFromData {
        from: Wallet {
            address: creator.clone(),
            chain: Chain::IC,
        },
        to: Wallet {
            address: Account {
                owner: canister_id.clone(),
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        spender: Wallet {
            address: Account {
                owner: canister_id.clone(),
                subaccount: None,
            }
            .to_string(),
            chain: Chain::IC,
        },
        asset: Asset {
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
            chain: Chain::IC,
        },
        amount: 10_0000,
    };
    fee_intent.r#type = IntentType::TransferFrom(fee_transfer_data);

    // Create temporary action
    let temp_action = TemporaryAction {
        id: action_id.clone(),
        r#type: ActionType::CreateLink,
        state: ActionState::Created,
        creator: creator.clone(),
        link_id: link_id.clone(),
        intents: vec![transfer_intent.clone(), fee_intent.clone()],
        default_link_user_state: None,
    };

    // Setup mocks
    when!(action_service.get_action_by_id).then_return(None);
    when!(ic_env.time).then_return(timestamp);

    // Mock the intent_to_transactions method for each intent
    // For transfer intent (ICRC1 Transfer)
    let icrc1_tx = Transaction {
        id: Uuid::new_v4().to_string(),
        created_at: timestamp,
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: transfer_intent.r#type.as_transfer().unwrap().from.clone(),
            to: transfer_intent.r#type.as_transfer().unwrap().to.clone(),
            asset: transfer_intent.r#type.as_transfer().unwrap().asset.clone(),
            amount: transfer_intent.r#type.as_transfer().unwrap().amount,
            memo: None,
            ts: Some(timestamp),
        })),
        group: 1,
        from_call_type: FromCallType::Wallet,
        start_ts: None,
    };
    when!(ic_intent_adapter.intent_to_transactions)
        .times(1)
        .then_return(Ok(vec![icrc1_tx]));

    // For fee intent (ICRC2 Approve + TransferFrom)
    let icrc2_approve_tx = Transaction {
        id: Uuid::new_v4().to_string(),
        created_at: timestamp,
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve {
            from: fee_intent.r#type.as_transfer_from().unwrap().from.clone(),
            spender: fee_intent
                .r#type
                .as_transfer_from()
                .unwrap()
                .spender
                .clone(),
            asset: fee_intent.r#type.as_transfer_from().unwrap().asset.clone(),
            amount: fee_intent.r#type.as_transfer_from().unwrap().amount,
        })),
        group: 1,
        from_call_type: FromCallType::Wallet,
        start_ts: None,
    };

    let icrc2_transfer_from_tx = Transaction {
        id: Uuid::new_v4().to_string(),
        created_at: timestamp,
        state: TransactionState::Created,
        dependency: Some(vec![icrc2_approve_tx.id.clone()]),
        protocol: Protocol::IC(IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
            from: fee_intent.r#type.as_transfer_from().unwrap().from.clone(),
            to: fee_intent.r#type.as_transfer_from().unwrap().to.clone(),
            spender: fee_intent
                .r#type
                .as_transfer_from()
                .unwrap()
                .spender
                .clone(),
            asset: fee_intent.r#type.as_transfer_from().unwrap().asset.clone(),
            amount: fee_intent.r#type.as_transfer_from().unwrap().amount,
            memo: None,
            ts: Some(timestamp),
        })),
        group: 1,
        from_call_type: FromCallType::Canister,
        start_ts: None,
    };

    when!(ic_intent_adapter.intent_to_transactions)
        .times(1)
        .then_return(Ok(vec![icrc2_approve_tx, icrc2_transfer_from_tx]));

    // Mock the store_action_data method
    when!(action_service.store_action_data).then_return(Ok(()));

    // Create the service under test
    let tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    // Execute the method under test
    let result = tx_manager_service.create_action(&temp_action);

    // Assertions
    assert!(
        result.is_ok(),
        "Expected create_action to succeed, but got: {:?}",
        result.err()
    );

    let action_dto = result.unwrap();
    assert_eq!(action_dto.id, action_id, "Action ID should match");
    assert_eq!(
        action_dto.state,
        ActionState::Created.to_string(),
        "Action state should be 'Created'"
    );

    // The second intent (fee) should have two transactions (approve + transferFrom)
    assert_eq!(action_dto.intents.len(), 2, "Should have 2 intents");
    assert_eq!(
        action_dto.intents[0].transactions.len(),
        2,
        "First intent should have 2 transaction"
    );

    // The first intent (transfer) should have one transaction
    assert_eq!(
        action_dto.intents[1].transactions.len(),
        1,
        "Second intent should have 1 transactions"
    );

    // Verify transaction details for second intent
    let approve_tx = &action_dto.intents[0].transactions[0];
    let transfer_from_tx = &action_dto.intents[0].transactions[1];
    assert_eq!(
        approve_tx.protocol, "Icrc2Approve",
        "First transaction of second intent should be ICRC2 Approve"
    );
    assert_eq!(
        transfer_from_tx.protocol, "Icrc2TransferFrom",
        "Second transaction of second intent should be ICRC2 TransferFrom"
    );

    // Verify dependency
    assert!(
        transfer_from_tx.dependency.is_some(),
        "TransferFrom should have a dependency"
    );
    assert_eq!(
        transfer_from_tx.dependency.as_ref().unwrap()[0],
        approve_tx.id,
        "TransferFrom should depend on Approve"
    );

    // Verify transaction details for first intent
    let first_tx = &action_dto.intents[1].transactions[0];
    assert_eq!(
        first_tx.protocol, "Icrc1Transfer",
        "First transaction should be ICRC1 Transfer"
    );
    assert_eq!(
        first_tx.state,
        TransactionState::Created.to_string(),
        "Transaction state should be 'Created'"
    );
    assert_eq!(
        first_tx.from_call_type, "Wallet",
        "Transaction should be from wallet"
    );
}

#[tokio::test]
async fn test_create_action_with_existing_action() {
    // Setup test fixture
    let (transaction_service, mut action_service, mut ic_env, icrc_service, ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let action_id = Uuid::new_v4().to_string();
    let link_id = Uuid::new_v4().to_string();
    let creator = generate_random_principal().to_text();

    // Create temporary action
    let temp_action = TemporaryAction {
        id: action_id.clone(),
        r#type: ActionType::CreateLink,
        state: ActionState::Created,
        creator: creator.clone(),
        link_id: link_id.clone(),
        intents: vec![create_dummy_intent(IntentState::Created)],
        default_link_user_state: None,
    };

    // Mock that the action already exists
    when!(action_service.get_action_by_id).then_return(Some(temp_action.as_action()));
    when!(ic_env.time).then_return(generate_timestamp());

    // Create the service under test
    let tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    // Execute the method under test
    let result = tx_manager_service.create_action(&temp_action);

    // Assertions
    assert!(
        result.is_err(),
        "Expected create_action to fail when action exists"
    );

    match result {
        Err(CanisterError::HandleLogicError(msg)) => {
            assert!(
                msg.contains("Action already exists"),
                "Expected error message to indicate action already exists"
            );
        }
        _ => panic!("Expected HandleLogicError but got: {:?}", result),
    }
}

#[tokio::test]
async fn test_create_action_with_intent_dependencies() {
    // Setup test fixture
    let (transaction_service, mut action_service, mut ic_env, icrc_service, mut ic_intent_adapter) =
        TransactionManagerTestFixture::setup();

    // Create mock data
    let action_id = Uuid::new_v4().to_string();
    let link_id = Uuid::new_v4().to_string();
    let creator = generate_random_principal().to_text();
    let timestamp = generate_timestamp();

    // Create multiple intents with dependencies
    let mut intent1 = create_dummy_intent(IntentState::Created);
    intent1.id = Uuid::new_v4().to_string();
    intent1.task = IntentTask::TransferWalletToLink;

    let mut intent2 = create_dummy_intent(IntentState::Created);
    intent2.id = Uuid::new_v4().to_string();
    intent2.task = IntentTask::TransferWalletToTreasury;

    let mut intent3 = create_dummy_intent(IntentState::Created);
    intent3.id = Uuid::new_v4().to_string();
    intent3.task = IntentTask::TransferWalletToLink;
    // Make intent3 depend on intent1 and intent2
    intent3.dependency = vec![intent1.id.clone(), intent2.id.clone()];

    // Create temporary action
    let temp_action = TemporaryAction {
        id: action_id.clone(),
        r#type: ActionType::CreateLink,
        state: ActionState::Created,
        creator: creator.clone(),
        link_id: link_id.clone(),
        intents: vec![intent1.clone(), intent2.clone(), intent3.clone()],
        default_link_user_state: None,
    };

    // Setup mocks
    when!(action_service.get_action_by_id).then_return(None);
    when!(ic_env.time).then_return(timestamp);

    // Create transactions for each intent
    let tx1 = Transaction {
        id: Uuid::new_v4().to_string(),
        created_at: timestamp,
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer::dummy(
            &mut rand::thread_rng(),
        ))),
        group: 1,
        from_call_type: FromCallType::Wallet,
        start_ts: None,
    };

    let tx2 = Transaction {
        id: Uuid::new_v4().to_string(),
        created_at: timestamp,
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer::dummy(
            &mut rand::thread_rng(),
        ))),
        group: 1,
        from_call_type: FromCallType::Wallet,
        start_ts: None,
    };

    let tx3 = Transaction {
        id: Uuid::new_v4().to_string(),
        created_at: timestamp,
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer::dummy(
            &mut rand::thread_rng(),
        ))),
        group: 2,
        from_call_type: FromCallType::Wallet,
        start_ts: None,
    };

    let tx4 = Transaction {
        id: Uuid::new_v4().to_string(),
        created_at: timestamp,
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer::dummy(
            &mut rand::thread_rng(),
        ))),
        group: 2,
        from_call_type: FromCallType::Wallet,
        start_ts: None,
    };

    // Mock the intent_to_transactions method for each intent
    when!(ic_intent_adapter.intent_to_transactions)
        .times(1)
        .then_return(Ok(vec![tx1]));

    when!(ic_intent_adapter.intent_to_transactions)
        .times(1)
        .then_return(Ok(vec![tx2, tx3]));

    when!(ic_intent_adapter.intent_to_transactions)
        .times(1)
        .then_return(Ok(vec![tx4]));

    // Mock the store_action_data method
    when!(action_service.store_action_data).then_return(Ok(()));

    // Create the service under test
    let tx_manager_service = TransactionManagerService::new(
        transaction_service,
        action_service,
        ic_env,
        icrc_service,
        ic_intent_adapter,
    );

    // Execute the method under test
    let result = tx_manager_service.create_action(&temp_action);

    // Assertions
    assert!(
        result.is_ok(),
        "Expected create_action to succeed, but got: {:?}",
        result.err()
    );

    let action_dto = result.unwrap();
    assert_eq!(action_dto.id, action_id, "Action ID should match");
    assert_eq!(
        action_dto.state,
        ActionState::Created.to_string(),
        "Action state should be 'Created'"
    );
    assert_eq!(action_dto.intents.len(), 3, "Should have 3 intents");

    // Check dependencies are propagated to transactions
    let tx3_result = &action_dto.intents[2].transactions[0];
    assert!(
        tx3_result.dependency.is_some(),
        "Third transaction should have dependencies"
    );
    let dependencies = tx3_result.dependency.as_ref().unwrap();

    // Verify that tx3 depends on tx1 and tx2
    assert_eq!(dependencies.len(), 3, "Should have 3 dependencies");
    assert!(
        dependencies.contains(&action_dto.intents[0].transactions[0].id),
        "Transaction should depend on first intent's transaction"
    );
    assert!(
        dependencies.contains(&action_dto.intents[1].transactions[0].id),
        "Transaction should depend on second intent's transaction"
    );
    assert!(
        dependencies.contains(&action_dto.intents[1].transactions[1].id),
        "Transaction should depend on its own transaction"
    );
}
