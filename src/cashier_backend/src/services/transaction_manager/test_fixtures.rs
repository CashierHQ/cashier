// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    services::transaction_manager::{service::TransactionManagerService, traits::ActionCreator},
    utils::test_utils::{random_id_string, random_principal_id, runtime::MockIcEnvironment},
};
use candid::Nat;
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

pub fn create_action_fixture(
    service: &TransactionManagerService<MockIcEnvironment>,
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

pub fn create_action_with_intents_fixture(
    service: &TransactionManagerService<MockIcEnvironment>,
    link_id: String,
) -> ActionDto {
    let action_id = random_id_string();
    let creator_id = random_principal_id();
    let intent_id1 = random_id_string();
    let intent_id2 = random_id_string();

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
                    asset: Asset::default(),
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
                    asset: Asset::default(),
                    amount: Nat::from(1000u64),
                }),
                label: "Test Intent with Dependency".to_string(),
            },
        ],
        default_link_user_state: None,
        state: ActionState::Created,
    };

    service.create_action(&mut temp_action).unwrap()
}

pub fn create_transaction_feature(
    service: &TransactionManagerService<MockIcEnvironment>,
) -> Transaction {
    let transaction = Transaction {
        id: random_id_string(),
        created_at: 1622547800,
        state: TransactionState::Created,
        dependency: None,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
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

pub fn create_action_data_fixture(
    service: &TransactionManagerService<MockIcEnvironment>,
) -> (Action, Vec<Intent>, Vec<Transaction>) {
    let action_id = random_id_string();
    let link_id = random_id_string();
    let user_id = random_principal_id();
    let intent_id = random_id_string();

    let link_action = LinkAction {
        link_id: link_id.clone(),
        action_id: action_id.clone(),
        action_type: ActionType::CreateLink.to_string(),
        user_id: user_id.clone(),
        link_user_state: None,
    };

    let action = Action {
        id: action_id,
        r#type: ActionType::CreateLink,
        state: ActionState::Created,
        creator: user_id.clone(),
        link_id,
    };
    let intents = vec![Intent {
        id: intent_id.clone(),
        r#type: IntentType::Transfer(TransferData {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
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
            asset: Asset::default(),
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
            asset: Asset::default(),
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
            asset: Asset::default(),
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
