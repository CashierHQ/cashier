// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
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

pub mod gate_service_mock {
    use gate_service_client::CanisterClientResult;
    use gate_service_types::{Gate, error::GateServiceError};

    use crate::services::gate::GateServiceTrait;

    // Test-only mock for GateServiceTrait. Provides an in-memory list of gates
    // that tests can seed and query without creating a real canister client.
    pub struct GateServiceMock {
        gates: std::sync::Mutex<Vec<Gate>>,
    }

    impl GateServiceMock {
        pub fn new() -> Self {
            Self {
                gates: std::sync::Mutex::new(Vec::new()),
            }
        }

        pub fn add_test_gate(&mut self, gate: Gate) {
            let mut g = self.gates.lock().unwrap();
            g.push(gate);
        }
    }

    impl GateServiceTrait for GateServiceMock {
        async fn get_gate_by_link_id(
            &self,
            link_id: &str,
        ) -> CanisterClientResult<Result<Option<Gate>, GateServiceError>> {
            let g = self.gates.lock().unwrap();
            let found = g.iter().find(|gate| gate.subject_id == link_id).cloned();
            Ok(Ok(found))
        }
    }
}
