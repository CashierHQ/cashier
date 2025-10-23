// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    link_v2::transaction_manager::traits::TransactionManager,
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
    link_v2::{CreateActionResult, ProcessActionResult},
    repository::{action::v1::Action, intent::v1::Intent},
};
use cashier_common::runtime::IcEnvironment;
use std::rc::Rc;

pub struct IcTransactionManager<E: IcEnvironment + Clone, R: Repositories> {
    pub repo: Rc<R>,
    pub transaction_service: TransactionService<E, R>,
    pub action_service: ActionService<R>,
    pub ic_env: E,
    pub icrc_service: IcrcService,
    pub intent_adapter: IntentAdapterImpl,
    pub action_repository: ActionRepository<R::Action>,
    pub processing_transaction_repository:
        ProcessingTransactionRepository<R::ProcessingTransaction>,
}

#[allow(clippy::too_many_arguments)]
impl<E: IcEnvironment + Clone, R: Repositories> IcTransactionManager<E, R> {
    pub fn new(repo: Rc<R>, ic_env: E) -> Self {
        Self {
            transaction_service: TransactionService::new(&repo, ic_env.clone()),
            action_service: ActionService::new(&repo),
            ic_env,
            icrc_service: IcrcService::new(),
            intent_adapter: IntentAdapterImpl::new(),
            action_repository: repo.action(),
            processing_transaction_repository: repo.processing_transaction(),
            repo,
        }
    }
}

impl<E: IcEnvironment + Clone, R: Repositories> TransactionManager for IcTransactionManager<E, R> {
    fn create_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
    ) -> Result<CreateActionResult, CanisterError> {
        Err(CanisterError::from(
            "IcTransactionManager create_action not implemented",
        ))
    }

    fn process_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
    ) -> Result<ProcessActionResult, CanisterError> {
        Err(CanisterError::from(
            "IcTransactionManager process_action not implemented",
        ))
    }
}
