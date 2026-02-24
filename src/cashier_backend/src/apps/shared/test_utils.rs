// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

#[cfg(test)]
pub mod tests {
    use candid::Principal;
    use cashier_backend_types::{
        error::CanisterError,
        link_v2::action_result::{CreateActionResult, ProcessActionResult},
        repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
    };
    use cashier_common::runtime::IcEnvironment;
    use ic_cdk_timers::TimerId;
    use std::{collections::HashMap, future::Future, pin::Pin, time::Duration};
    use transaction_manager::traits::TransactionManager;

    /// Mock implementation of the IC environment for testing purposes
    pub struct MockIcEnvironment {
        pub current_time: u64,
    }

    impl MockIcEnvironment {
        pub fn new(start_time: u64) -> Self {
            Self {
                current_time: start_time,
            }
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

    /// Mock implementation of the TransactionManager trait for testing purposes
    #[derive(Clone)]
    pub struct MockTransactionManager {
        pub is_failed: bool,
    }

    #[allow(clippy::derivable_impls)]
    impl Default for MockTransactionManager {
        fn default() -> Self {
            Self { is_failed: false }
        }
    }

    impl MockTransactionManager {
        pub fn set_failed(&mut self, is_failed: bool) {
            self.is_failed = is_failed;
        }
    }

    impl TransactionManager for MockTransactionManager {
        fn create_action(
            &self,
            action: Action,
            intents: Vec<Intent>,
            intent_txs_map: Option<HashMap<String, Vec<Transaction>>>,
        ) -> Result<CreateActionResult, CanisterError> {
            let is_failed = self.is_failed;

            if is_failed {
                Err(CanisterError::HandleLogicError(format!(
                    "TxManager creates action failed for action {}",
                    action.id
                )))
            } else {
                Ok(CreateActionResult {
                    action,
                    intents,
                    intent_txs_map: intent_txs_map.unwrap_or_default(),
                    icrc112_requests: None,
                })
            }
        }

        fn process_action(
            &self,
            action: Action,
            intents: Vec<Intent>,
            intent_txs_map: HashMap<String, Vec<Transaction>>,
        ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResult, CanisterError>>>> {
            let is_failed = self.is_failed;

            Box::pin(async move {
                if is_failed {
                    Err(CanisterError::HandleLogicError(format!(
                        "TxManager process action failed for action {}",
                        action.id
                    )))
                } else {
                    Ok(ProcessActionResult {
                        action,
                        intents,
                        intent_txs_map,
                        icrc112_requests: None,
                        is_success: true,
                        errors: vec![],
                    })
                }
            })
        }
    }
}
