// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_common::test_utils;

pub fn random_id_string() -> String {
    test_utils::random_id_string()
}

pub fn random_principal_id() -> String {
    test_utils::random_principal_id()
}

pub mod runtime {
    use super::super::runtime::IcEnvironment;
    use candid::Principal;
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

    impl MockIcEnvironment {
        pub fn new() -> Self {
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
