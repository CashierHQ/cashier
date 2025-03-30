use action::ActionService;
use adapter::AdapterRegistry;
use manual_check_status::ManualCheckStatusService;
use transaction::TransactionService;

use crate::utils::{icrc::IcrcService, runtime::IcEnvironment};

pub mod action;
pub mod adapter;
pub mod implement;
pub mod manual_check_status;
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
    ic_env: E,
    icrc_service: IcrcService,
    // Adapter registry
    adapter_registry: AdapterRegistry<E>,
}

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn new(
        transaction_service: TransactionService<E>,
        action_service: ActionService<E>,
        ic_env: E,
        icrc_service: IcrcService,
        adapter_registry: AdapterRegistry<E>,
    ) -> Self {
        Self {
            transaction_service,
            action_service,
            ic_env,
            icrc_service,
            adapter_registry,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(
            TransactionService::get_instance(),
            ActionService::get_instance(),
            IcEnvironment::new(),
            IcrcService::new(),
            AdapterRegistry::new(),
        )
    }
}
