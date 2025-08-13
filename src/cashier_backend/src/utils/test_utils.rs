// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

#[cfg(test)]
#[allow(clippy::items_after_test_module)]
pub mod runtime {
    use super::super::runtime::IcEnvironment;
    use candid::Principal;
    use ic_cdk_timers::{self, TimerId};
    use std::{cell::RefCell, future::Future, time::Duration};

    #[derive(Clone)]
    pub struct MockIcEnvironment {
        pub caller: Principal,
        pub canister_id: Principal,
        pub current_time: u64,
        pub spawned_futures: RefCell<Vec<String>>,
        pub timers: RefCell<Vec<(Duration, String)>>,
        timer_counter: RefCell<u64>,
    }

    impl MockIcEnvironment {
        pub fn new_with_caller(caller: Principal) -> Self {
            Self {
                caller,
                canister_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                current_time: 1640995200000000000,
                spawned_futures: RefCell::new(Vec::new()),
                timers: RefCell::new(Vec::new()),
                timer_counter: RefCell::new(0),
            }
        }

        pub fn anonymous() -> Self {
            Self::new_with_caller(Principal::anonymous())
        }
    }

    impl IcEnvironment for MockIcEnvironment {
        fn new() -> Self {
            Self::anonymous()
        }

        fn caller(&self) -> Principal {
            self.caller
        }

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

use candid::Principal;
use rand::prelude::*;
use uuid::Uuid;

pub fn random_id_string() -> String {
    let id = Uuid::new_v4();
    id.to_string()
}

pub fn random_principal_id() -> String {
    let mut rng = thread_rng();
    let mut arr = [0u8; 29];
    rng.fill_bytes(&mut arr);
    Principal::from_slice(&arr).to_text()
}
