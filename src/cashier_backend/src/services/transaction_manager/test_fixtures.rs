// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repositories::tests::TestRepositories,
    services::transaction_manager::{service::TransactionManagerService, traits::ActionCreator},
    utils::test_utils::{random_id_string, random_principal_id, runtime::MockIcEnvironment},
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    dto::action::ActionDto,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::{Asset, Chain, Wallet},
        intent::v2::{Intent, IntentState, IntentTask, IntentType, TransferData},
        link_action::v1::LinkAction,
        transaction::v2::{
            FromCallType, IcTransaction, Icrc1Transfer, Protocol, Transaction, TransactionState,
        },
    },
    service::link::TemporaryAction,
};
use std::collections::HashMap;

/// Creates a new action fixture for testing purposes.
/// This function generates a random action ID and creates a new action
/// in the action repository.
pub fn create_action_fixture(
    service: &mut TransactionManagerService<MockIcEnvironment, TestRepositories>,
    link_id: String,
) -> Action {
    let action_id = random_id_string();
    let creator_id = random_principal_id();
    let action = Action {
        id: action_id,
        r#type: ActionType::CreateLink,
        state: ActionState::Created,
        creator: creator_id,
        link_id,
    };
    service.action_repository.create(action.clone());
    action
}

/// Creates a new action fixture with intents for testing purposes.
/// This function generates a random action ID and creates a new action
/// in the action repository.
/// The action contains 2 intents, which the 2nd intent depends on the 1st intent.
pub fn create_action_with_intents_fixture(
    service: &mut TransactionManagerService<MockIcEnvironment, TestRepositories>,
    link_id: String,
) -> ActionDto {
    let action_id = random_id_string();
    let creator_id = random_principal_id();
    let intent_id1 = random_id_string();
    let intent_id2 = random_id_string();

    let ts = 1622547800;
    let mut temp_action = TemporaryAction {
        id: action_id,
        r#type: ActionType::CreateLink,
        creator: creator_id,
        link_id,
        intents: vec![
            Intent {
                id: intent_id1.clone(),
                state: IntentState::Created,
                created_at: 1622547800,
                dependency: vec![],
                chain: Chain::IC,
                task: IntentTask::TransferWalletToLink,
                r#type: IntentType::Transfer(TransferData {
                    from: Wallet::default(),
                    to: Wallet::default(),
                    asset: Asset::IC {
                        address: Principal::anonymous(),
                    },
                    amount: Nat::from(1000u64),
                }),
                label: "Test Intent".to_string(),
            },
            Intent {
                id: intent_id2,
                state: IntentState::Created,
                created_at: 1622547800,
                dependency: vec![intent_id1],
                chain: Chain::IC,
                task: IntentTask::TransferWalletToLink,
                r#type: IntentType::Transfer(TransferData {
                    from: Wallet::default(),
                    to: Wallet::default(),
                    asset: Asset::IC {
                        address: Principal::anonymous(),
                    },
                    amount: Nat::from(1000u64),
                }),
                label: "Test Intent with Dependency".to_string(),
            },
        ],
        default_link_user_state: None,
        state: ActionState::Created,
    };

    service.create_action(ts, &mut temp_action).unwrap()
}

/// Creates a new transaction fixture for testing purposes.
/// This function generates a random transaction ID and creates a new transaction
/// in the transaction repository.
pub fn create_transaction_fixture(
    service: &mut TransactionManagerService<MockIcEnvironment, TestRepositories>,
) -> Transaction {
    let transaction = Transaction {
        id: random_id_string(),
        created_at: 1622547800,
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::IC {
                address: random_principal_id(),
            },
            amount: Nat::from(1000u64),
            ts: None,
            memo: None,
        })),
        group: 1,
        from_call_type: FromCallType::Canister,
        start_ts: None,
    };
    service
        .action_service
        .transaction_repository
        .batch_create(vec![transaction.clone()]);
    transaction
}

/// Creates a new action data fixture for testing purposes.
/// This function generates a random action ID, a random link ID, and creates a new action
/// in the action repository along with its associated intents and transactions.
pub fn create_action_data_fixture(
    service: &mut TransactionManagerService<MockIcEnvironment, TestRepositories>,
) -> (Action, Vec<Intent>, Vec<Transaction>) {
    let action_id = random_id_string();
    let link_id = random_id_string();
    let user_id = random_principal_id();
    let intent_id = random_id_string();

    let link_action = LinkAction {
        link_id: link_id.clone(),
        action_id: action_id.clone(),
        action_type: ActionType::CreateLink,
        user_id,
        link_user_state: None,
    };

    let action = Action {
        id: action_id,
        r#type: ActionType::CreateLink,
        state: ActionState::Created,
        creator: user_id,
        link_id,
    };
    let intents = vec![Intent {
        id: intent_id.clone(),
        r#type: IntentType::Transfer(TransferData {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::IC {
                address: random_principal_id(),
            },
            amount: Nat::from(1000u64),
        }),
        state: IntentState::Created,
        created_at: 1622547800,
        dependency: vec![],
        chain: Chain::IC,
        label: "Test Intent".to_string(),
        task: IntentTask::TransferWalletToLink,
    }];

    let tx1 = Transaction {
        id: random_id_string(),
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::IC {
                address: random_principal_id(),
            },
            amount: Nat::from(1000u64),
            ts: None,
            memo: None,
        })),
        group: 1,
        from_call_type: FromCallType::Canister,
        start_ts: None,
        created_at: 1622547800,
    };

    let tx2 = Transaction {
        id: random_id_string(),
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::IC {
                address: random_principal_id(),
            },
            amount: Nat::from(1000u64),
            ts: None,
            memo: None,
        })),
        group: 1,
        from_call_type: FromCallType::Canister,
        start_ts: None,
        created_at: 1622547800,
    };

    let tx3 = Transaction {
        id: random_id_string(),
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::IC {
                address: random_principal_id(),
            },
            amount: Nat::from(1000u64),
            ts: None,
            memo: None,
        })),
        group: 1,
        from_call_type: FromCallType::Canister,
        start_ts: None,
        created_at: 1622547800,
    };

    let mut intent_tx_map = HashMap::new();
    intent_tx_map.insert(intent_id, vec![tx1.clone(), tx2.clone(), tx3.clone()]);

    service
        .action_service
        .store_action_data(
            link_action,
            action.clone(),
            intents.clone(),
            intent_tx_map,
            user_id,
        )
        .unwrap();
    (action, intents, vec![tx1, tx2, tx3])
}
