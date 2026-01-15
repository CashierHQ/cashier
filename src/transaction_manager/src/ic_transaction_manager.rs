// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::adapter::IntentAdapterTrait;
use crate::icrc112::create_icrc_112_requests;
use crate::{
    adapter::ic::intent::IcIntentAdapter,
    traits::TransactionManager,
    transaction::{
        dependency_analyzer::DependencyAnalyzer, executor_service::ExecutorService,
        validator_service::ValidatorService,
    },
    transaction::{
        ic_transaction_executor::IcTransactionExecutor,
        ic_transaction_validator::IcTransactionValidator,
    },
};
use cashier_common::utils::get_link_account;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::action_result::{CreateActionResult, ProcessActionResult},
    repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
};
use cashier_common::runtime::IcEnvironment;
use std::{
    collections::{HashMap, HashSet},
    future::Future,
    pin::Pin,
    rc::Rc,
};

pub struct IcTransactionManager<E: IcEnvironment> {
    pub ic_env: E,
    pub intent_adapter: IcIntentAdapter,
    pub dependency_analyzer: DependencyAnalyzer,
}

#[allow(clippy::too_many_arguments)]
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

impl<E: IcEnvironment> TransactionManager for IcTransactionManager<E> {
    /// Create action by generating transactions from intents,
    /// analyzing dependencies, and creating ICRC-112 requests.
    /// # Arguments
    /// * `action` - The action to be created
    /// * `intents` - The intents associated with the action
    /// # Returns
    /// * `Result<CreateActionResult, CanisterError>` - The result of creating the action
    fn create_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: Option<HashMap<String, Vec<Transaction>>>,
    ) -> Result<CreateActionResult, CanisterError> {
        let current_ts = self.ic_env.time();

        // assemble intent transactions
        let mut transactions = Vec::<Transaction>::new();
        let mut intent_txs_map = if let Some(map) = intent_txs_map {
            map
        } else {
            let mut intent_txs_map = HashMap::<String, Vec<Transaction>>::new();

            for intent in intents.iter() {
                let intent_transactions = self
                    .intent_adapter
                    .intent_to_transactions(current_ts, intent)?;
                transactions.extend(intent_transactions.clone());
                intent_txs_map.insert(intent.id.clone(), intent_transactions);
            }
            intent_txs_map
        };

        // transaction with dependencies filled
        let mut transactions = self
            .dependency_analyzer
            .analyze_and_fill_transaction_dependencies(&intents, &intent_txs_map)?;

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

        Ok(CreateActionResult {
            action,
            intents,
            intent_txs_map,
            icrc112_requests: Some(icrc112_requests),
        })
    }

    /// Process action by validating and executing transactions,
    /// and rolling up the action and intents states.
    /// # Arguments
    /// * `action` - The action to be processed
    /// * `intents` - The intents associated with the action
    /// * `intent_txs_map` - A mapping of intent IDs to their associated transactions
    /// # Returns
    /// * `Result<ProcessActionResult, CanisterError>` - The result of processing the action
    fn process_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResult, CanisterError>>>> {
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

        // create ICRC112 requests from transactions
        let canister_id = self.ic_env.id();
        let link_id = action.link_id.clone();
        let validator_service = ValidatorService::new(Rc::new(IcTransactionValidator));
        let executor_service = ExecutorService::new(Rc::new(IcTransactionExecutor));

        Box::pin(async move {
            // validate and update transactions dependencies and states
            let validate_transactions_result = validator_service
                .validate_action_transactions(&transactions)
                .await?;
            errors.extend(validate_transactions_result.errors.clone());

            processed_transactions.extend(validate_transactions_result.wallet_transactions);
            is_success &= validate_transactions_result.is_success;

            // execute canister transactions if all dependencies are resolved
            if validate_transactions_result.is_success {
                let executed_transactions_result = executor_service
                    .execute_transactions(&validate_transactions_result.canister_transactions)
                    .await?;

                processed_transactions.extend(executed_transactions_result.transactions);
                errors.extend(executed_transactions_result.errors);
                is_success &= executed_transactions_result.is_success;
            } else {
                processed_transactions.extend(validate_transactions_result.canister_transactions);
            }

            let link_account = get_link_account(&link_id, canister_id)?;
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
            let rollup_action_state_result = validator_service.rollup_action_state(
                action.clone(),
                &intents,
                updated_intent_txs_map.clone(),
            )?;

            Ok(ProcessActionResult {
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
    use candid::Nat;
    use candid::Principal;
    use cashier_backend_types::repository::action::v1::{Action, ActionState, ActionType};
    use cashier_backend_types::repository::common::{Asset, Wallet};
    use cashier_backend_types::repository::intent::v1::{IntentTask, IntentType, TransferData};

    // Use the shared mock environment from test utilities
    use crate::utils::test_utils::runtime::MockIcEnvironment;

    #[tokio::test]
    async fn test_create_action_generates_icrc_requests() {
        // Arrange: create manager with shared mock env
        let mut env = MockIcEnvironment::default();
        // tests expect a smaller now value; override the default if needed
        env.current_time = 1_700_000_000;
        let manager = IcTransactionManager::new(env);

        // prepare action
        let action = Action {
            id: "action1".to_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: Principal::anonymous(),
            link_id: "11111111-1111-1111-1111-111111111111".to_string(),
        };

        // prepare an intent that will be converted to an ICRC1 wallet transfer
        let mut intent = crate::utils::test_utils::generate_mock_intent("intent1", vec![]);
        // adjust to the wallet->link transfer task
        intent.task = IntentTask::TransferWalletToLink;
        intent.r#type = IntentType::Transfer(TransferData {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(1u64),
        });

        // Act
        let res = manager.create_action(action.clone(), vec![intent.clone()], None);
        println!("Create action result: {:?}", res);

        // Assert
        assert!(res.is_ok());
        let create_res = res.unwrap();
        // should return intent and intent_txs_map containing our intent
        assert_eq!(create_res.intents.len(), 1);
        assert!(create_res.intent_txs_map.contains_key(&intent.id));
        // should generate icrc112 requests
        assert!(create_res.icrc112_requests.is_some());
        let requests = create_res.icrc112_requests.unwrap();
        // there should be at least one group of requests
        assert!(!requests.is_empty());
        // and each request group should contain at least one request
        assert!(requests.iter().all(|group| !group.is_empty()));
    }
}
