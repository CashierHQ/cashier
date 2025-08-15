// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::rc::Rc;

use crate::{
    repositories::{
        action::ActionRepository, processing_transaction::ProcessingTransactionRepository,
        user_wallet::UserWalletRepository, Repositories,
    },
    services::{
        action::ActionService, adapter::IntentAdapterImpl, transaction::TransactionService,
    },
    utils::{icrc::IcrcService, runtime::IcEnvironment},
};

pub struct TransactionManagerService<E: IcEnvironment + Clone, R:Repositories> {
    pub repo: Rc<R>,
    pub transaction_service: TransactionService<E, R>,
    pub action_service: ActionService<R>,
    pub ic_env: E,
    pub icrc_service: IcrcService,
    pub intent_adapter: IntentAdapterImpl<E>,
    pub user_wallet_repository: UserWalletRepository<R::UserWallet>,
    pub action_repository: ActionRepository<R::Action>,
    pub processing_transaction_repository: ProcessingTransactionRepository<R::ProcessingTransaction>,
}

impl <E: IcEnvironment + Clone, R:Repositories> Clone for TransactionManagerService<E, R> {
    fn clone(&self) -> Self {
        Self::new(self.repo.clone(), self.ic_env.clone())
    }
}

#[allow(clippy::too_many_arguments)]
impl<E: IcEnvironment + Clone, R:Repositories> TransactionManagerService<E, R> {
    pub fn new(repo: Rc<R>, ic_env: E) -> Self {
        Self {
            transaction_service: TransactionService::new(&repo, ic_env.clone()),
            action_service: ActionService::new(&repo),
            user_wallet_repository: repo.user_wallet(),
            ic_env,
            icrc_service: IcrcService::new(),
            intent_adapter: IntentAdapterImpl::new(),
            action_repository: repo.action(),
            processing_transaction_repository: repo.processing_transaction(),
            repo,
        }
    }

}
