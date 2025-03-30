use std::time::Duration;

use action::ActionService;
use adapter::AdapterRegistry;
use cashier_types::{Intent, Transaction};
use icrc_ledger_types::icrc1::account::Account;
use manual_check_status::ManualCheckStatusService;
use timeout::tx_timeout_task;
use transaction::TransactionService;

use crate::{
    info,
    types::{error::CanisterError, icrc_112_transaction::Icrc112Requests},
    utils::{
        icrc::IcrcService,
        runtime::{IcEnvironment, RealIcEnvironment},
    },
};

pub mod action;
pub mod adapter;
pub mod implement;
pub mod manual_check_status;
pub mod timeout;
pub mod transaction;
pub mod validate;
#[derive(Debug, Clone)]
pub struct UpdateActionArgs {
    pub action_id: String,
    pub link_id: String,
    // using for marking the method called outside of icrc-112
    pub execute_wallet_tx: bool,
}

// #[create]
pub struct TransactionManagerService<E: IcEnvironment + Clone> {
    transaction_service: TransactionService<E>,
    action_service: ActionService<E>,
    manual_check_status_service: ManualCheckStatusService<E>,
    ic_env: E,
    icrc_service: IcrcService,
    // Adapter registry
    adapter_registry: AdapterRegistry<E>,
}

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn new(
        transaction_service: TransactionService<E>,
        action_service: ActionService<E>,
        manual_check_status_service: ManualCheckStatusService<E>,
        ic_env: E,
        icrc_service: IcrcService,
        adapter_registry: AdapterRegistry<E>,
    ) -> Self {
        Self {
            transaction_service,
            action_service,
            manual_check_status_service,
            ic_env,
            icrc_service,
            adapter_registry,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            TransactionService::get_instance(),
            ActionService::get_instance(),
            ManualCheckStatusService::get_instance(),
            IcEnvironment::new(),
            IcrcService::new(),
            AdapterRegistry::new(),
        )
    }
}
