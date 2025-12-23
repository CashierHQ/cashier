// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use candid::Principal;
use cashier_backend_types::repository::common::{Asset, Chain, Wallet};
use cashier_backend_types::repository::intent::v1::{
    Intent, IntentState, IntentTask, IntentType, TransferData,
};
use cashier_backend_types::repository::transaction::v1::{
    FromCallType, IcTransaction, Icrc1Transfer, Protocol, Transaction, TransactionState,
};
use cashier_common::test_utils;

pub fn random_id_string() -> String {
    test_utils::random_id_string()
}

pub fn random_principal_id() -> Principal {
    test_utils::random_principal_id()
}

pub mod runtime {
    use candid::Principal;
    use cashier_common::runtime::IcEnvironment;
    use ic_cdk_timers::{self, TimerId};
    use std::{cell::RefCell, future::Future, time::Duration};

    #[derive(Clone)]
    pub struct MockIcEnvironment {
        pub canister_id: Principal,
        pub current_time: u64,
        pub spawned_futures: RefCell<Vec<String>>,
        pub timers: RefCell<Vec<(Duration, String)>>,
        timer_counter: RefCell<u64>,
    }

    impl Default for MockIcEnvironment {
        fn default() -> Self {
            Self {
                canister_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                current_time: 1640995200000000000,
                spawned_futures: RefCell::new(Vec::new()),
                timers: RefCell::new(Vec::new()),
                timer_counter: RefCell::new(0),
            }
        }
    }

    impl IcEnvironment for MockIcEnvironment {
        fn id(&self) -> Principal {
            self.canister_id
        }

        fn time(&self) -> u64 {
            self.current_time
        }

        fn spawn<F>(&self, _future: F)
        where
            F: Future<Output = ()> + 'static,
        {
            self.spawned_futures
                .borrow_mut()
                .push("spawned".to_string());
        }

        fn set_timer(&self, delay: Duration, _f: impl FnOnce() + 'static) -> TimerId {
            self.timers.borrow_mut().push((delay, "timer".to_string()));

            // Increment counter for unique timer IDs
            let mut counter = self.timer_counter.borrow_mut();
            *counter += 1;

            ic_cdk_timers::set_timer(Duration::from_secs(1), || {
                ic_cdk::println!("This is a mock timer!")
            })
        }
    }
}

pub fn generate_mock_intent(id: &str, dependencies: Vec<&str>) -> Intent {
    Intent {
        id: id.to_string(),
        state: IntentState::Created,
        created_at: 0,
        dependency: dependencies.into_iter().map(ToString::to_string).collect(),
        chain: Chain::IC,
        task: IntentTask::TransferWalletToTreasury,
        r#type: IntentType::Transfer(TransferData {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(100u64),
        }),
        label: "mock_intent".to_string(),
    }
}

pub fn generate_mock_transaction(id: &str, dependencies: Vec<&str>) -> Transaction {
    Transaction {
        id: id.to_string(),
        created_at: 0,
        state: TransactionState::Created,
        dependency: if dependencies.is_empty() {
            None
        } else {
            Some(dependencies.into_iter().map(ToString::to_string).collect())
        },
        group: 0,
        from_call_type: FromCallType::Canister,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(0u64),
            memo: None,
            ts: None,
        })),
        start_ts: None,
    }
}
