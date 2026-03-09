// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    link_v3::action_result::{
        CreateActionResult as CreateActionResultV3, ProcessActionResult as ProcessActionResultV3,
    },
    repository::{action::v3::ActionV3, intent::v3::IntentV3, transaction::v1::Transaction},
};
use cashier_common::{runtime::IcEnvironment, utils::get_link_account};
use std::collections::{HashMap, HashSet};

use crate::{
    adapter::ic::intent::{traits::IntentAdapterTraitV3, v1::IcIntentAdapter},
    icrc112::create_icrc_112_requests,
    transaction::{
        dependency_analyzer::DependencyAnalyzer,
        traits::{ExecutionService, ValidationService},
    },
    v3::traits::TransactionManagerV3,
};

pub struct IcTransactionManager<E: IcEnvironment> {
    pub ic_env: E,
    pub intent_adapter: IcIntentAdapter,
    pub dependency_analyzer: DependencyAnalyzer,
}

impl<E: IcEnvironment> IcTransactionManager<E> {
    pub fn new(ic_env: E) -> Self {
        let intent_adapter = IcIntentAdapter;
        let dependency_analyzer = DependencyAnalyzer;

        Self {
            ic_env,
            intent_adapter,
            dependency_analyzer,
        }
    }
}

impl<E: IcEnvironment> TransactionManagerV3 for IcTransactionManager<E> {
    fn create_action(
        &self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: Option<HashMap<String, Vec<Transaction>>>,
    ) -> Result<CreateActionResultV3, CanisterError> {
        let current_ts = self.ic_env.time();
        let canister_id = self.ic_env.id();

        // assemble intent transactions
        let mut transactions = Vec::<Transaction>::new();
        let mut intent_txs_map = if let Some(map) = intent_txs_map {
            map
        } else {
            let mut intent_txs_map = HashMap::<String, Vec<Transaction>>::new();

            for intent in intents.iter() {
                let intent_transactions = self.intent_adapter.intent_to_transactions_v3(
                    canister_id,
                    current_ts,
                    intent,
                )?;
                transactions.extend(intent_transactions.clone());
                intent_txs_map.insert(intent.id.clone(), intent_transactions);
            }
            intent_txs_map
        };

        // transaction with dependencies filled
        let mut transactions = self
            .dependency_analyzer
            .analyze_and_fill_transaction_dependencies_v3(&intents, &intent_txs_map)?;

        // update intent_txs_map with updated transactions
        for intent in intents.iter() {
            let tx_ids = intent_txs_map
                .get(&intent.id)
                .unwrap()
                .iter()
                .map(|tx| tx.id.clone())
                .collect::<HashSet<String>>();

            let updated_txs = transactions
                .iter()
                .filter(|tx| tx_ids.contains(&tx.id))
                .cloned()
                .collect::<Vec<Transaction>>();

            intent_txs_map.insert(intent.id.clone(), updated_txs);
        }

        // create ICRC112 requests from transactions
        let canister_id = self.ic_env.id();
        let link_account = get_link_account(&action.link_id, canister_id)?;
        let icrc112_requests =
            create_icrc_112_requests(&mut transactions, link_account, canister_id, current_ts)?;

        Ok(CreateActionResultV3 {
            action,
            intents,
            intent_txs_map,
            icrc112_requests: Some(icrc112_requests),
        })
    }

    fn process_action<'a, V, X>(
        &'a self,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        validator_service: V,
        executor_service: X,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<ProcessActionResultV3, CanisterError>> + 'a>,
    >
    where
        V: ValidationService + 'a,
        X: ExecutionService + 'a,
    {
        Box::pin(async move {
            let current_ts = self.ic_env.time();

            // extract all transactions from intent_txs_map, these transactions are fulfilled with dependencies
            let mut transactions = Vec::<Transaction>::new();
            let mut processed_transactions = Vec::<Transaction>::new();
            let mut errors = Vec::<String>::new();
            let mut is_success = true;
            for intent in intents.iter() {
                if let Some(intent_transactions) = intent_txs_map.get(&intent.id) {
                    transactions.extend(intent_transactions.clone());
                }
            }

            // verify and execute transactions
            let canister_id = self.ic_env.id();

            // validate and update transactions dependencies and states
            let validation_result = validator_service
                .validate_action_transactions(&transactions)
                .await?;

            processed_transactions.extend(validation_result.wallet_transactions);
            errors.extend(validation_result.errors);
            is_success &= validation_result.is_success;

            // execute canister transactions
            if !validation_result.canister_transactions.is_empty() {
                let executed_transactions_result = executor_service
                    .execute_transactions(&validation_result.canister_transactions)
                    .await?;

                processed_transactions.extend(executed_transactions_result.transactions);
                errors.extend(executed_transactions_result.errors);
                is_success &= executed_transactions_result.is_success;
            }

            // rollup ICRC-2 wallet transaction states from canister transaction executions
            validator_service.rollup_icrc2_wallet_transaction_state(&mut processed_transactions);

            // create ICRC-112 requests from failed transactions for retry
            let link_account = get_link_account(&action.link_id, canister_id)?;
            let icrc112_requests = create_icrc_112_requests(
                &mut processed_transactions,
                link_account,
                canister_id,
                current_ts,
            )?;

            // update intent_txs_map with processed transactions
            let mut updated_intent_txs_map = HashMap::<String, Vec<Transaction>>::new();
            for intent in intents.iter() {
                let tx_ids = intent_txs_map
                    .get(&intent.id)
                    .unwrap()
                    .iter()
                    .map(|tx| tx.id.clone())
                    .collect::<HashSet<String>>();

                let updated_txs = processed_transactions
                    .iter()
                    .filter(|tx| tx_ids.contains(&tx.id))
                    .cloned()
                    .collect::<Vec<Transaction>>();

                updated_intent_txs_map.insert(intent.id.clone(), updated_txs);
            }

            // rollup action and intents states from processed transactions
            let rollup_action_state_result = validator_service.rollup_action_state_v3(
                action.clone(),
                intents.clone(),
                updated_intent_txs_map.clone(),
            )?;

            Ok(ProcessActionResultV3 {
                action: rollup_action_state_result.action,
                intents: rollup_action_state_result.intents,
                intent_txs_map: updated_intent_txs_map,
                icrc112_requests: Some(icrc112_requests),
                is_success,
                errors,
            })
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::runtime::MockIcEnvironment;
    use candid::Nat;
    use cashier_backend_types::{
        error::CanisterError,
        link_v2::transaction_manager::{ExecuteTransactionsResult, ValidateActionTransactionsResult},
        link_v3::transaction_manager::RollupActionStateResultV3,
        repository::{
            action::{
                v1::{ActionState, ActionType},
                v3::ActionV3,
            },
            asset::{v1::Asset, v3::AssetV3},
            common::{AddressTypeV3, Wallet},
            intent::{
                v1::IntentState,
                v3::{IntentTypeV3, IntentV3},
            },
            transaction::v1::{
                FromCallType, IcTransaction, Icrc1Transfer, Protocol, Transaction, TransactionState,
            },
        },
    };
    use icrc_ledger_types::icrc1::transfer::Memo;
    use std::{
        cell::RefCell,
        collections::HashMap,
        future::Future,
        pin::Pin,
        rc::Rc,
    };

    #[derive(Clone)]
    struct MockValidationService {
        validate_result: Result<ValidateActionTransactionsResult, CanisterError>,
        rollup_result_v3: Result<RollupActionStateResultV3, CanisterError>,
        rollup_called: Rc<RefCell<bool>>,
    }

    impl ValidationService for MockValidationService {
        fn validate_action_transactions<'a>(
            &'a self,
            _transactions: &'a [Transaction],
        ) -> Pin<
            Box<
                dyn Future<Output = Result<ValidateActionTransactionsResult, CanisterError>> + 'a,
            >,
        > {
            let result = self.validate_result.clone();
            Box::pin(async move { result })
        }

        fn rollup_icrc2_wallet_transaction_state(&self, _transactions: &mut [Transaction]) {
            *self.rollup_called.borrow_mut() = true;
        }

        fn rollup_action_state(
            &self,
            _action: cashier_backend_types::repository::action::v1::Action,
            _intents: &[cashier_backend_types::repository::intent::v1::Intent],
            _intent_txs_map: HashMap<String, Vec<Transaction>>,
        ) -> Result<cashier_backend_types::link_v2::transaction_manager::RollupActionStateResult, CanisterError> {
            Err(CanisterError::HandleLogicError(
                "unused in v3 tests".to_string(),
            ))
        }

        fn rollup_action_state_v3(
            &self,
            _action: ActionV3,
            _intents: Vec<IntentV3>,
            _intent_txs_map: HashMap<String, Vec<Transaction>>,
        ) -> Result<RollupActionStateResultV3, CanisterError> {
            self.rollup_result_v3.clone()
        }
    }

    #[derive(Clone)]
    struct MockExecutionService {
        execute_result: Result<ExecuteTransactionsResult, CanisterError>,
        execute_called: Rc<RefCell<usize>>,
    }

    impl ExecutionService for MockExecutionService {
        fn execute_transactions<'a>(
            &'a self,
            _transactions: &'a [Transaction],
        ) -> Pin<Box<dyn Future<Output = Result<ExecuteTransactionsResult, CanisterError>> + 'a>>
        {
            *self.execute_called.borrow_mut() += 1;
            let result = self.execute_result.clone();
            Box::pin(async move { result })
        }
    }

    fn fixture_of_manager() -> IcTransactionManager<MockIcEnvironment> {
        let env = MockIcEnvironment::default();
        IcTransactionManager::new(env)
    }

    fn fixture_of_action_v3(link_id: &str) -> ActionV3 {
        ActionV3 {
            id: "action_v3_id".to_string(),
            action_type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: candid::Principal::anonymous(),
            creator_address_type: AddressTypeV3::Creator,
            link_id: link_id.to_string(),
            intent_ids: vec!["intent_v3_id".to_string()],
        }
    }

    fn fixture_of_intent_v3(intent_id: &str) -> IntentV3 {
        IntentV3 {
            id: intent_id.to_string(),
            label: "intent_v3".to_string(),
            intent_type: IntentTypeV3::Send,
            asset: AssetV3::default(),
            amount: Nat::from(100u64),
            total_amount: Some(Nat::from(100u64)),
            network_fee: None,
            user_fee: None,
            source_address: candid::Principal::anonymous(),
            source_account: None,
            source_address_type: AddressTypeV3::Creator,
            dest_address: candid::Principal::anonymous(),
            dest_account: None,
            dest_address_type: AddressTypeV3::Link,
            intent_tx_data: None,
            dependencies: vec![],
            action_id: "action_v3_id".to_string(),
            state: IntentState::Created,
            created_at: 0,
        }
    }

    fn fixture_of_wallet_transaction_created(tx_id: &str) -> Transaction {
        Transaction {
            id: tx_id.to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 1,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(100u64),
                memo: Some(Memo::default()),
                ts: Some(1_600_000_000_000_000_000),
            })),
            start_ts: None,
        }
    }

    fn fixture_of_canister_transaction_created(tx_id: &str) -> Transaction {
        Transaction {
            id: tx_id.to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 1,
            from_call_type: FromCallType::Canister,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(100u64),
                memo: Some(Memo::default()),
                ts: Some(1_600_000_000_000_000_000),
            })),
            start_ts: None,
        }
    }

    fn fixture_of_intent_txs_map(
        intent_id: &str,
        txs: Vec<Transaction>,
    ) -> HashMap<String, Vec<Transaction>> {
        let mut intent_txs_map = HashMap::new();
        intent_txs_map.insert(intent_id.to_string(), txs);
        intent_txs_map
    }

    fn fixture_of_rollup_result_v3(action: ActionV3, intents: Vec<IntentV3>) -> RollupActionStateResultV3 {
        RollupActionStateResultV3 {
            action,
            intents,
            intent_txs_map: HashMap::new(),
        }
    }

    #[test]
    fn it_should_fail_create_action_due_to_invalid_link_id() {
        // Arrange
        let manager = fixture_of_manager();
        let action = fixture_of_action_v3("invalid-link-id");

        // Act
        let result = manager.create_action(action, vec![], Some(HashMap::new()));

        // Assert
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_validation_service_error() {
        // Arrange
        let manager = fixture_of_manager();
        let action = fixture_of_action_v3("11111111-1111-1111-1111-111111111111");
        let intent = fixture_of_intent_v3("intent_v3_id");
        let tx = fixture_of_wallet_transaction_created("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        let intent_txs_map = fixture_of_intent_txs_map(&intent.id, vec![tx]);

        let validation_service = MockValidationService {
            validate_result: Err(CanisterError::HandleLogicError(
                "validation failed".to_string(),
            )),
            rollup_result_v3: Ok(fixture_of_rollup_result_v3(
                action.clone(),
                vec![intent.clone()],
            )),
            rollup_called: Rc::new(RefCell::new(false)),
        };
        let execution_service = MockExecutionService {
            execute_result: Ok(ExecuteTransactionsResult {
                transactions: vec![],
                is_success: true,
                errors: vec![],
            }),
            execute_called: Rc::new(RefCell::new(0)),
        };

        // Act
        let result = manager
            .process_action(
                action,
                vec![intent],
                intent_txs_map,
                validation_service,
                execution_service,
            )
            .await;

        // Assert
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_execution_service_error() {
        // Arrange
        let manager = fixture_of_manager();
        let action = fixture_of_action_v3("11111111-1111-1111-1111-111111111111");
        let intent = fixture_of_intent_v3("intent_v3_id");
        let input_tx = fixture_of_canister_transaction_created("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        let intent_txs_map = fixture_of_intent_txs_map(&intent.id, vec![input_tx]);

        let validation_service = MockValidationService {
            validate_result: Ok(ValidateActionTransactionsResult {
                wallet_transactions: vec![],
                canister_transactions: vec![fixture_of_canister_transaction_created(
                    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                )],
                is_success: true,
                errors: vec![],
            }),
            rollup_result_v3: Ok(fixture_of_rollup_result_v3(
                action.clone(),
                vec![intent.clone()],
            )),
            rollup_called: Rc::new(RefCell::new(false)),
        };
        let execution_service = MockExecutionService {
            execute_result: Err(CanisterError::HandleLogicError(
                "execution failed".to_string(),
            )),
            execute_called: Rc::new(RefCell::new(0)),
        };

        // Act
        let result = manager
            .process_action(
                action,
                vec![intent],
                intent_txs_map,
                validation_service,
                execution_service,
            )
            .await;

        // Assert
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_rollup_action_state_v3_error() {
        // Arrange
        let manager = fixture_of_manager();
        let action = fixture_of_action_v3("11111111-1111-1111-1111-111111111111");
        let intent = fixture_of_intent_v3("intent_v3_id");
        let tx = fixture_of_wallet_transaction_created("cccccccc-cccc-cccc-cccc-cccccccccccc");
        let mut tx_success = tx.clone();
        tx_success.state = TransactionState::Success;
        let intent_txs_map = fixture_of_intent_txs_map(&intent.id, vec![tx]);

        let validation_service = MockValidationService {
            validate_result: Ok(ValidateActionTransactionsResult {
                wallet_transactions: vec![tx_success],
                canister_transactions: vec![],
                is_success: true,
                errors: vec![],
            }),
            rollup_result_v3: Err(CanisterError::HandleLogicError("rollup failed".to_string())),
            rollup_called: Rc::new(RefCell::new(false)),
        };
        let execution_service = MockExecutionService {
            execute_result: Ok(ExecuteTransactionsResult {
                transactions: vec![],
                is_success: true,
                errors: vec![],
            }),
            execute_called: Rc::new(RefCell::new(0)),
        };

        // Act
        let result = manager
            .process_action(
                action,
                vec![intent],
                intent_txs_map,
                validation_service,
                execution_service,
            )
            .await;

        // Assert
        assert!(result.is_err());
    }

    #[test]
    fn it_should_succeed_create_action_due_to_valid_inputs_and_provided_intent_txs_map() {
        // Arrange
        let manager = fixture_of_manager();
        let action = fixture_of_action_v3("11111111-1111-1111-1111-111111111111");
        let intent = fixture_of_intent_v3("intent_v3_id");
        let tx = fixture_of_wallet_transaction_created("dddddddd-dddd-dddd-dddd-dddddddddddd");
        let intent_txs_map = fixture_of_intent_txs_map(&intent.id, vec![tx]);

        // Act
        let result = manager.create_action(action, vec![intent.clone()], Some(intent_txs_map));

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(result.intent_txs_map.contains_key(&intent.id));
        assert!(result.icrc112_requests.is_some());
        assert!(!result.icrc112_requests.unwrap().is_empty());
    }

    #[tokio::test]
    async fn it_should_succeed_process_action_due_to_validation_and_execution_success() {
        // Arrange
        let manager = fixture_of_manager();
        let action = fixture_of_action_v3("11111111-1111-1111-1111-111111111111");
        let intent = fixture_of_intent_v3("intent_v3_id");
        let input_tx = fixture_of_canister_transaction_created("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
        let intent_txs_map = fixture_of_intent_txs_map(&intent.id, vec![input_tx]);

        let rollup_called = Rc::new(RefCell::new(false));
        let execute_called = Rc::new(RefCell::new(0));
        let validation_service = MockValidationService {
            validate_result: Ok(ValidateActionTransactionsResult {
                wallet_transactions: vec![],
                canister_transactions: vec![fixture_of_canister_transaction_created(
                    "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
                )],
                is_success: true,
                errors: vec![],
            }),
            rollup_result_v3: Ok(fixture_of_rollup_result_v3(
                action.clone(),
                vec![intent.clone()],
            )),
            rollup_called: rollup_called.clone(),
        };
        let execution_service = MockExecutionService {
            execute_result: Ok(ExecuteTransactionsResult {
                transactions: vec![{
                    let mut tx =
                        fixture_of_canister_transaction_created("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
                    tx.state = TransactionState::Success;
                    tx
                }],
                is_success: true,
                errors: vec![],
            }),
            execute_called: execute_called.clone(),
        };

        // Act
        let result = manager
            .process_action(
                action,
                vec![intent],
                intent_txs_map,
                validation_service,
                execution_service,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(result.is_success);
        assert!(result.errors.is_empty());
        assert!(*rollup_called.borrow());
        assert_eq!(*execute_called.borrow(), 1);
    }

    #[tokio::test]
    async fn it_should_succeed_process_action_due_to_no_canister_transactions_for_execution() {
        // Arrange
        let manager = fixture_of_manager();
        let action = fixture_of_action_v3("11111111-1111-1111-1111-111111111111");
        let intent = fixture_of_intent_v3("intent_v3_id");
        let tx = fixture_of_wallet_transaction_created("ffffffff-ffff-ffff-ffff-ffffffffffff");
        let mut tx_success = tx.clone();
        tx_success.state = TransactionState::Success;
        let intent_txs_map = fixture_of_intent_txs_map(&intent.id, vec![tx]);

        let rollup_called = Rc::new(RefCell::new(false));
        let execute_called = Rc::new(RefCell::new(0));
        let validation_service = MockValidationService {
            validate_result: Ok(ValidateActionTransactionsResult {
                wallet_transactions: vec![tx_success],
                canister_transactions: vec![],
                is_success: true,
                errors: vec![],
            }),
            rollup_result_v3: Ok(fixture_of_rollup_result_v3(
                action.clone(),
                vec![intent.clone()],
            )),
            rollup_called: rollup_called.clone(),
        };
        let execution_service = MockExecutionService {
            execute_result: Ok(ExecuteTransactionsResult {
                transactions: vec![],
                is_success: true,
                errors: vec![],
            }),
            execute_called: execute_called.clone(),
        };

        // Act
        let result = manager
            .process_action(
                action,
                vec![intent],
                intent_txs_map,
                validation_service,
                execution_service,
            )
            .await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(result.is_success);
        assert!(result.errors.is_empty());
        assert!(*rollup_called.borrow());
        assert_eq!(*execute_called.borrow(), 0);
    }
}
