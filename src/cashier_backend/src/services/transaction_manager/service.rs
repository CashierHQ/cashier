// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repositories::{action::ActionRepository, user_wallet::UserWalletRepository},
    services::{
        action::ActionService, adapter::IntentAdapterImpl, transaction::TransactionService,
    },
    utils::{icrc::IcrcService, runtime::IcEnvironment},
};

pub struct TransactionManagerService<E: IcEnvironment + Clone> {
    pub transaction_service: TransactionService<E>,
    pub action_service: ActionService,
    pub ic_env: E,
    pub icrc_service: IcrcService,
    pub intent_adapter: IntentAdapterImpl<E>,
    pub user_wallet_repository: UserWalletRepository,
    pub action_repository: ActionRepository,
}

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn new(
        transaction_service: TransactionService<E>,
        action_service: ActionService,
        ic_env: E,
        icrc_service: IcrcService,
        intent_adapter: IntentAdapterImpl<E>,
        user_wallet_repository: UserWalletRepository,
        action_repository: ActionRepository,
    ) -> Self {
        Self {
            transaction_service,
            action_service,
            ic_env,
            icrc_service,
            intent_adapter,
            user_wallet_repository,
            action_repository,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            TransactionService::get_instance(),
            ActionService::get_instance(),
            IcEnvironment::new(),
            IcrcService::new(),
            IntentAdapterImpl::new(),
            UserWalletRepository::new(),
            ActionRepository::new(),
        )
    }
}
