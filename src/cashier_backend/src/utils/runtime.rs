// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::{future::Future, time::Duration};

use candid::Principal;

pub trait IcEnvironment {
    fn new() -> Self;
    fn caller(&self) -> Principal;
    fn id(&self) -> Principal;
    fn time(&self) -> u64;
    fn println(&self, message: &str);
    fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + 'static;
    fn set_timer(&self, delay: Duration, f: impl FnOnce() + 'static) -> TimerId;
    // Add other IC-specific methods as needed
}

use ic_cdk::{
    api::{self, canister_self, msg_caller},
    futures::spawn,
};
use ic_cdk_timers::TimerId;

#[derive(Clone)]
pub struct RealIcEnvironment;

impl IcEnvironment for RealIcEnvironment {
    fn new() -> Self {
        Self {}
    }
    fn caller(&self) -> Principal {
        msg_caller()
    }
    fn id(&self) -> Principal {
        canister_self()
    }
    fn time(&self) -> u64 {
        api::time()
    }
    fn println(&self, message: &str) {
        ic_cdk::println!("{}", message);
    }
    fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + 'static,
    {
        spawn(future)
    }

    fn set_timer(&self, delay: Duration, f: impl FnOnce() + 'static) -> TimerId {
        ic_cdk_timers::set_timer(delay, f)
    }
    // Implement other methods
}

#[cfg(test)]
pub mod test_utils {
    use super::*;

    #[derive(Clone)]
    pub struct MockIcEnvironment {
        pub caller: Principal,
        pub id: Principal,
        pub time: u64,
    }

    impl MockIcEnvironment {
        pub fn new() -> Self {
            Self {
                caller: Principal::anonymous(),
                id: Principal::from_text("edrez-4iaaa-aaaam-aekta-cai").unwrap(),
                time: 1640995200000000000, // Jan 1, 2022 in nanoseconds
            }
        }

        pub fn new_with_caller(caller: Principal) -> Self {
            Self {
                caller,
                id: Principal::from_text("edrez-4iaaa-aaaam-aekta-cai").unwrap(),
                time: 1640995200000000000,
            }
        }

        pub fn new_with_time(time: u64) -> Self {
            Self {
                caller: Principal::anonymous(),
                id: Principal::from_text("edrez-4iaaa-aaaam-aekta-cai").unwrap(),
                time,
            }
        }

        pub fn new_with_caller_and_time(caller: Principal, time: u64) -> Self {
            Self {
                caller,
                id: Principal::from_text("edrez-4iaaa-aaaam-aekta-cai").unwrap(),
                time,
            }
        }
    }

    impl IcEnvironment for MockIcEnvironment {
        fn new() -> Self {
            Self::new()
        }

        fn caller(&self) -> Principal {
            self.caller
        }

        fn id(&self) -> Principal {
            self.id
        }

        fn time(&self) -> u64 {
            self.time
        }

        fn println(&self, message: &str) {
            println!("Mock IC: {}", message);
        }

        fn spawn<F>(&self, _future: F)
        where
            F: Future<Output = ()> + 'static,
        {
            // In mock environment, we don't actually spawn futures
            // This is a no-op for testing
        }

        fn set_timer(&self, _delay: Duration, _f: impl FnOnce() + 'static) -> TimerId {
            // Return a dummy timer ID for testing
            TimerId::default()
        }
    }

    /// Helper function to create a MockIcEnvironment for testing
    pub fn create_mock_ic_environment() -> MockIcEnvironment {
        MockIcEnvironment::new()
    }

    /// Helper function to create a MockIcEnvironment with a specific caller
    pub fn create_mock_ic_environment_with_caller(caller: Principal) -> MockIcEnvironment {
        MockIcEnvironment::new_with_caller(caller)
    }

    /// Helper function to create a MockIcEnvironment with a specific time
    pub fn create_mock_ic_environment_with_time(time: u64) -> MockIcEnvironment {
        MockIcEnvironment::new_with_time(time)
    }
}
