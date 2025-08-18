// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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

pub mod runtime {
    use super::super::runtime::IcEnvironment;
    use candid::Principal;
    use ic_cdk_timers::{self, TimerId};
    use std::{cell::RefCell, future::Future, rc::Rc, time::Duration};

    #[derive(Clone)]
    pub struct MockIcEnvironment {
        state: Rc<RefCell<MockIcState>>,
    }

    struct MockIcState {
        canister_id: Principal,
        current_time: u64,
        spawned_futures: Vec<String>,
        timers: Vec<(Duration, String)>,
        timer_counter: u64,
    }

    impl MockIcEnvironment {
        pub fn new() -> Self {
            let state = MockIcState {
                canister_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                // Thursday, 14 August 2025 12:15:00
                current_time: 1755173400 * 1_000_000_000,
                spawned_futures: Vec::new(),
                timers: Vec::new(),
                timer_counter: 0,
            };

            Self {
                state: Rc::new(RefCell::new(state)),
            }
        }

        /// Advance the shared clock. This takes &self so cloned instances can advance the same time.
        pub fn advance_time(&self, duration: Duration) {
            let mut s = self.state.borrow_mut();
            s.current_time = s.current_time.wrapping_add(duration.as_nanos() as u64);
        }
    }

    impl IcEnvironment for MockIcEnvironment {
        fn id(&self) -> Principal {
            self.state.borrow().canister_id
        }

        fn time(&self) -> u64 {
            self.state.borrow().current_time
        }

        fn spawn<F>(&self, _future: F)
        where
            F: Future<Output = ()> + 'static,
        {
            self.state
                .borrow_mut()
                .spawned_futures
                .push("spawned".to_string());
        }

        fn set_timer(&self, delay: Duration, _f: impl FnOnce() + 'static) -> TimerId {
            let mut s = self.state.borrow_mut();
            s.timers.push((delay, "timer".to_string()));

            // Increment counter for unique timer IDs
            s.timer_counter = s.timer_counter.wrapping_add(1);

            ic_cdk_timers::set_timer(Duration::from_secs(1), || {
                ic_cdk::println!("This is a mock timer!")
            })
        }
    }
}
