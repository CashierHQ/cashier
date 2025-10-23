// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    link_v2::{
        icrc112::create_icrc_112_requests,
        transaction::traits::{TransactionExecutor, TransactionValidator},
        transaction_manager::{
            dependency_analyzer::DependencyAnalyzer, traits::TransactionManager,
        },
        utils::icrc_token::{get_link_account, get_link_ext_account},
    },
    repositories::{
        Repositories, action::ActionRepository,
        processing_transaction::ProcessingTransactionRepository,
    },
    services::{
        action::ActionService, adapter::IntentAdapterImpl, transaction::TransactionService,
    },
    utils::icrc::IcrcService,
};
use cashier_backend_types::{
    error::CanisterError,
    link_v2::action_result::{CreateActionResult, ProcessActionResult},
    repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
};
use cashier_common::runtime::IcEnvironment;
use std::{
    collections::{HashMap, HashSet},
    rc::Rc,
};

pub struct IcTransactionManager<E: IcEnvironment, V: TransactionValidator, T: TransactionExecutor> {
    pub ic_env: E,
    pub intent_adapter: IntentAdapterImpl,
    pub dependency_analyzer: DependencyAnalyzer<V, T>,
}

#[allow(clippy::too_many_arguments)]
impl<E: IcEnvironment, V: TransactionValidator, T: TransactionExecutor>
    IcTransactionManager<E, V, T>
{
    pub fn new(ic_env: E, transaction_validator: V, transaction_executor: T) -> Self {
        let intent_adapter = IntentAdapterImpl::new();
        let dependency_analyzer =
            DependencyAnalyzer::new(transaction_validator, transaction_executor);

        Self {
            ic_env,
            intent_adapter,
            dependency_analyzer,
        }
    }
}

impl<E: IcEnvironment, V: TransactionValidator, T: TransactionExecutor> TransactionManager
    for IcTransactionManager<E, V, T>
{
    fn create_action(
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

    fn process_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<ProcessActionResult, CanisterError> {
        let created_at = self.ic_env.time();

        // extract all transactions from intent_txs_map
        // these transactions are fulfilled with dependencies
        let mut transactions = Vec::<Transaction>::new();
        for intent in intents.iter() {
            if let Some(intent_transactions) = intent_txs_map.get(&intent.id) {
                transactions.extend(intent_transactions.clone());
            }
        }

        // validate and update transactions dependencies and states

        Err(CanisterError::from(
            "IcTransactionManager process_action not implemented",
        ))
    }
}
