pub mod tests {
    use crate::{
        services::{
            __tests__::tests::MockIcEnvironment,
            transaction_manager::{
                action::ActionService, adapter::AdapterRegistry,
                manual_check_status::ManualCheckStatusService, transaction::TransactionService,
                TransactionManagerService,
            },
        },
        utils::icrc::IcrcService,
    };

    // Helper function to create a basic transaction manager service with mocks
    fn create_test_service() -> (
        TransactionManagerService<MockIcEnvironment>,
        TransactionService<MockIcEnvironment>,
        ActionService<MockIcEnvironment>,
        MockIcEnvironment,
        IcrcService,
        AdapterRegistry<MockIcEnvironment>,
    ) {
        let transaction_service = TransactionService::faux();
        let action_service = ActionService::faux();
        let manual_check_status_service = ManualCheckStatusService::faux();
        let ic_env = MockIcEnvironment::faux();
        let icrc_service = IcrcService::faux();
        let adapter_registry = AdapterRegistry::faux();

        let service = TransactionManagerService::new(
            transaction_service.clone(),
            action_service.clone(),
            manual_check_status_service.clone(),
            ic_env.clone(),
            icrc_service.clone(),
            adapter_registry.clone(),
        );

        (
            service,
            transaction_service,
            action_service,
            manual_check_status_service,
            ic_env,
            icrc_service,
            execute_transaction_service,
            adapter_registry,
        )
    }
}
