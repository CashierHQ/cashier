// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

#[cfg(test)]
pub mod tests {
    use candid::Principal;
    use cashier_backend_types::{
        error::CanisterError,
        link_v2::action_result::{CreateActionResult, ProcessActionResult},
        link_v2::transaction_manager::{
            ExecuteTransactionsResult, ValidateActionTransactionsResult,
        },
        link_v3::action_result::{
            CreateActionResult as CreateActionResultV3,
            ProcessActionResult as ProcessActionResultV3,
        },
        link_v3::transaction_manager::RollupActionStateResultV3,
        repository::{
            action::{v1::Action, v3::ActionV3},
            intent::{v1::Intent, v3::IntentV3},
            transaction::v1::Transaction,
        },
    };
    use cashier_common::runtime::IcEnvironment;
    use ic_cdk_timers::TimerId;
    use std::{collections::HashMap, future::Future, pin::Pin, time::Duration};
    use transaction_manager::{
        transaction::traits::{ExecutionService, ValidationService},
        v2::traits::TransactionManager,
        v3::traits::TransactionManagerV3,
    };

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

    /// Mock implementation of the TransactionManagerV3 trait for testing purposes
    #[derive(Clone)]
    pub struct MockTransactionManagerV3 {
        pub is_failed: bool,
    }

    #[allow(clippy::derivable_impls)]
    impl Default for MockTransactionManagerV3 {
        fn default() -> Self {
            Self { is_failed: false }
        }
    }

    impl MockTransactionManagerV3 {
        pub fn set_failed(&mut self, is_failed: bool) {
            self.is_failed = is_failed;
        }
    }

    impl TransactionManagerV3 for MockTransactionManagerV3 {
        fn create_action(
            &self,
            action: ActionV3,
            intents: Vec<IntentV3>,
            intent_txs_map: Option<HashMap<String, Vec<Transaction>>>,
        ) -> Result<CreateActionResultV3, CanisterError> {
            if self.is_failed {
                Err(CanisterError::HandleLogicError(format!(
                    "TxManager creates action failed for action {}",
                    action.id
                )))
            } else {
                Ok(CreateActionResultV3 {
                    action,
                    intents,
                    intent_txs_map: intent_txs_map.unwrap_or_default(),
                    icrc112_requests: None,
                })
            }
        }

        fn process_action<'a, V, X>(
            &'a self,
            action: ActionV3,
            intents: Vec<IntentV3>,
            intent_txs_map: HashMap<String, Vec<Transaction>>,
            _validation_service: V,
            _execution_service: X,
        ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResultV3, CanisterError>> + 'a>>
        where
            V: transaction_manager::transaction::traits::ValidationService + 'a,
            X: transaction_manager::transaction::traits::ExecutionService + 'a,
        {
            let is_failed = self.is_failed;

            Box::pin(async move {
                if is_failed {
                    Err(CanisterError::HandleLogicError(format!(
                        "TxManager process action failed for action {}",
                        action.id
                    )))
                } else {
                    Ok(ProcessActionResultV3 {
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

    #[derive(Clone, Default)]
    pub struct MockValidationService;

    impl ValidationService for MockValidationService {
        fn validate_action_transactions<'a>(
            &'a self,
            _transactions: &'a [Transaction],
        ) -> Pin<
            Box<dyn Future<Output = Result<ValidateActionTransactionsResult, CanisterError>> + 'a>,
        > {
            Box::pin(async {
                Ok(ValidateActionTransactionsResult {
                    wallet_transactions: vec![],
                    canister_transactions: vec![],
                    is_success: true,
                    errors: vec![],
                })
            })
        }

        fn rollup_icrc2_wallet_transaction_state(&self, _transactions: &mut [Transaction]) {}

        fn rollup_action_state(
            &self,
            _action: cashier_backend_types::repository::action::v1::Action,
            _intents: &[cashier_backend_types::repository::intent::v1::Intent],
            _intent_txs_map: HashMap<String, Vec<Transaction>>,
        ) -> Result<
            cashier_backend_types::link_v2::transaction_manager::RollupActionStateResult,
            CanisterError,
        > {
            Err(CanisterError::HandleLogicError(
                "unused in v3 tests".to_string(),
            ))
        }

        fn rollup_action_state_v3(
            &self,
            action: ActionV3,
            intents: Vec<IntentV3>,
            intent_txs_map: HashMap<String, Vec<Transaction>>,
        ) -> Result<RollupActionStateResultV3, CanisterError> {
            Ok(RollupActionStateResultV3 {
                action,
                intents,
                intent_txs_map,
            })
        }
    }

    #[derive(Clone, Default)]
    pub struct MockExecutionService;

    impl ExecutionService for MockExecutionService {
        fn execute_transactions<'a>(
            &'a self,
            _transactions: &'a [Transaction],
        ) -> Pin<Box<dyn Future<Output = Result<ExecuteTransactionsResult, CanisterError>> + 'a>>
        {
            Box::pin(async {
                Ok(ExecuteTransactionsResult {
                    transactions: vec![],
                    is_success: true,
                    errors: vec![],
                })
            })
        }
    }
}
