// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::adapter::{IntentAdapterTrait, IntentAdapterV3Trait};
use crate::icrc112::create_icrc_112_requests;
use crate::{
    adapter::ic::intent::IcIntentAdapter,
    transaction::{
        dependency_analyzer::DependencyAnalyzer, executor_service::ExecutorService,
        validator_service::ValidatorService,
    },
    transaction::{
        ic_transaction_executor::IcTransactionExecutor,
        ic_transaction_validator::IcTransactionValidator,
    },
    v3::traits::TransactionManagerV3,
};
use cashier_backend_types::dto::link;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::action_result::{CreateActionResult, ProcessActionResult},
    link_v3::action_result::{
        CreateActionResult as CreateActionResultV3, ProcessActionResult as ProcessActionResultV3,
    },
    repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
};
use cashier_common::runtime::IcEnvironment;
use cashier_common::utils::get_link_account;
use cashier_shared::types::Action as ActionShared;
use std::{
    collections::{HashMap, HashSet},
    future::Future,
    pin::Pin,
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

impl<E: IcEnvironment> TransactionManagerV3 for IcTransactionManager<E> {
    fn create_action(
        &self,
        link_id: String,
        action: ActionShared,
    ) -> Result<CreateActionResultV3, CanisterError> {
        let current_ts = self.ic_env.time();
        let canister_id = self.ic_env.id();

        // assemble intent transactions
        let mut transactions = Vec::<Transaction>::new();

        let mut intent_txs_map = HashMap::<String, Vec<Transaction>>::new();

        for intent in action.intents.iter() {
            let intent_transactions =
                self.intent_adapter
                    .intent_to_transactions_v3(canister_id, current_ts, intent)?;
            transactions.extend(intent_transactions.clone());
            intent_txs_map.insert(intent.id.clone(), intent_transactions);
        }

        // transaction with dependencies filled
        let mut transactions = self
            .dependency_analyzer
            .analyze_and_fill_transaction_dependencies_v3(&action.intents, &intent_txs_map)?;

        // update intent_txs_map with updated transactions
        for intent in action.intents.iter() {
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
        let link_account = get_link_account(&link_id, canister_id)?;
        let icrc112_requests =
            create_icrc_112_requests(&mut transactions, link_account, canister_id, current_ts)?;

        Ok(CreateActionResultV3 {
            action,
            icrc112_requests: Some(icrc112_requests),
        })
    }

    fn process_action(
        &self,
        link_id: String,
        action: ActionShared,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResultV3, CanisterError>>>> {
        let current_ts = self.ic_env.time();

        // extract all transactions from intent_txs_map, these transactions are fulfilled with dependencies
        let mut transactions = Vec::<Transaction>::new();
        let mut processed_transactions = Vec::<Transaction>::new();
        let mut errors = Vec::<String>::new();
        let mut is_success = true;
        for intent in action.intents.iter() {
            if let Some(intent_transactions) = intent_txs_map.get(&intent.id) {
                transactions.extend(intent_transactions.clone());
            }
        }

        // verify and execute transactions
        let canister_id = self.ic_env.id();
        let validator_service = ValidatorService::new(IcTransactionValidator);
        let executor_service = ExecutorService::new(IcTransactionExecutor);

        Box::pin(async move {
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
            let link_account = get_link_account(&link_id, canister_id)?;
            let icrc112_requests = create_icrc_112_requests(
                &mut processed_transactions,
                link_account,
                canister_id,
                current_ts,
            )?;

            // update intent_txs_map with processed transactions
            let mut updated_intent_txs_map = HashMap::<String, Vec<Transaction>>::new();
            for intent in action.intents.iter() {
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
            let rollup_action_state_result = validator_service
                .rollup_action_state_v3(action.clone(), updated_intent_txs_map.clone())?;

            Ok(ProcessActionResultV3 {
                action: rollup_action_state_result.action,
                intent_txs_map: updated_intent_txs_map,
                icrc112_requests: Some(icrc112_requests),
                is_success,
                errors,
            })
        })
    }
}
