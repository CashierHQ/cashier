// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    link_v2::{
        icrc112::create_icrc_112_requests,
        transaction::{
            ic_transaction_executor::IcTransactionExecutor,
            ic_transaction_validator::IcTransactionValidator,
        },
        transaction_manager::{
            dependency_analyzer::DependencyAnalyzer, executor_service::ExecutorService,
            traits::TransactionManager, validator_service::ValidatorService,
        },
        utils::icrc_token::get_link_account,
    },
    services::adapter::IntentAdapterImpl,
};
use cashier_backend_types::{
    error::CanisterError,
    link_v2::action_result::{CreateActionResult, ProcessActionResult},
    repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
};
use cashier_common::runtime::IcEnvironment;
use log::debug;
use std::{
    collections::{HashMap, HashSet},
    rc::Rc,
};

pub struct IcTransactionManager<E: IcEnvironment> {
    pub ic_env: E,
    pub intent_adapter: IntentAdapterImpl,
    pub dependency_analyzer: DependencyAnalyzer,
    pub validator_service: ValidatorService<IcTransactionValidator>,
    pub executor_service: ExecutorService<IcTransactionExecutor>,
}

#[allow(clippy::too_many_arguments)]
impl<E: IcEnvironment> IcTransactionManager<E> {
    pub fn new(ic_env: E) -> Self {
        let intent_adapter = IntentAdapterImpl::new();
        let transaction_validator = Rc::new(IcTransactionValidator);
        let transaction_executor = Rc::new(IcTransactionExecutor);
        let dependency_analyzer = DependencyAnalyzer;
        let validator_service = ValidatorService::new(Rc::clone(&transaction_validator));
        let executor_service = ExecutorService::new(Rc::clone(&transaction_executor));

        Self {
            ic_env,
            intent_adapter,
            dependency_analyzer,
            validator_service,
            executor_service,
        }
    }
}

impl<E: IcEnvironment> TransactionManager for IcTransactionManager<E> {
    async fn create_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
    ) -> Result<CreateActionResult, CanisterError> {
        let created_at = self.ic_env.time();

        // assemble intent transactions
        let mut transactions = Vec::<Transaction>::new();
        let mut intent_txs_map = HashMap::<String, Vec<Transaction>>::new();

        for intent in intents.iter() {
            let chain = intent.chain.clone();
            let intent_transactions = self
                .intent_adapter
                .intent_to_transactions(&chain, created_at, intent)?;
            transactions.extend(intent_transactions.clone());
            intent_txs_map.insert(intent.id.clone(), intent_transactions);
        }

        // transaction with dependencies filled
        let transactions = self
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
        let icrc112_requests = create_icrc_112_requests(&transactions, link_account, canister_id)?;

        Ok(CreateActionResult {
            action,
            intents,
            intent_txs_map,
            icrc112_requests: Some(icrc112_requests),
        })
    }

    async fn process_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<ProcessActionResult, CanisterError> {
        // extract all transactions from intent_txs_map, these transactions are fulfilled with dependencies
        let mut transactions = Vec::<Transaction>::new();
        let mut processed_transactions = Vec::<Transaction>::new();
        for intent in intents.iter() {
            if let Some(intent_transactions) = intent_txs_map.get(&intent.id) {
                transactions.extend(intent_transactions.clone());
            }
        }

        debug!("Action transactions {:?}", transactions);

        // validate and update transactions dependencies and states
        let validate_transactions_result = self
            .validator_service
            .validate_action_transactions(&transactions)
            .await?;

        debug!("Validated transactions {:?}", validate_transactions_result);

        processed_transactions.extend(validate_transactions_result.wallet_transactions);

        // execute canister transactions if all dependencies are resolved
        if validate_transactions_result.is_dependencies_resolved {
            let executed_transactions = self
                .executor_service
                .execute_transactions(&validate_transactions_result.canister_transactions)
                .await?;

            debug!("Executed canister transactions {:?}", executed_transactions);

            processed_transactions.extend(executed_transactions);
        } else {
            processed_transactions.extend(validate_transactions_result.canister_transactions);
        }

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
        let rollup_action_state_result = self.validator_service.rollup_action_state(
            action,
            &intents,
            updated_intent_txs_map.clone(),
        )?;

        debug!(
            "Rolled up action state {:?}",
            rollup_action_state_result.action
        );
        debug!("Rolled up intents {:?}", rollup_action_state_result.intents);

        Ok(ProcessActionResult {
            action: rollup_action_state_result.action,
            intents: rollup_action_state_result.intents,
            intent_txs_map: updated_intent_txs_map,
            is_success: validate_transactions_result.is_dependencies_resolved,
            errors: validate_transactions_result.errors,
        })
    }
}
