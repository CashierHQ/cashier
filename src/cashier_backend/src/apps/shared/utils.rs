// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

#[cfg(test)]
pub mod tests {
    use candid::Principal;
    use cashier_common::runtime::IcEnvironment;
    use ic_cdk_timers::TimerId;
    use std::time::Duration;

    pub struct MockIcEnvironment {
        pub current_time: u64,
    }

    impl MockIcEnvironment {
        pub fn new(start_time: u64) -> Self {
            Self {
                current_time: start_time,
            }
        }

        pub fn advance_time(&mut self, delta: u64) {
            self.current_time += delta;
        }
    }

    impl IcEnvironment for MockIcEnvironment {
        fn id(&self) -> Principal {
            Principal::from_text("aaaaa-aa").unwrap()
        }

        fn time(&self) -> u64 {
            self.current_time
        }

        fn spawn<F>(&self, _future: F)
        where
            F: Future<Output = ()> + 'static,
        {
            // No-op for testing
        }

        fn set_timer(&self, _delay: Duration, _f: impl FnOnce() + 'static) -> TimerId {
            // No-op for testing
            ic_cdk_timers::set_timer(Duration::from_secs(1), || {})
        }
    }
}
