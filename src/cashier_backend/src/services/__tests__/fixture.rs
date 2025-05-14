use crate::{
    services::{
        __tests__::tests::MockIcEnvironment,
        action::ActionService,
        adapter::{
            ic::{action::IcActionAdapter, intent::IcIntentAdapter},
            IntentAdapterImpl,
        },
        transaction::TransactionService,
    },
    utils::icrc::IcrcService,
};

/// A test fixture for transaction manager tests that standardizes test setup
pub struct TransactionManagerTestFixture {}

impl TransactionManagerTestFixture {
    /// Create a new fixture with mocked services
    pub fn setup() -> (
        TransactionService<MockIcEnvironment>,
        ActionService<MockIcEnvironment>,
        MockIcEnvironment,
        IcrcService,
        IntentAdapterImpl<MockIcEnvironment>,
    ) {
        let transaction_service = TransactionService::faux();
        let action_service = ActionService::faux();
        let ic_env = MockIcEnvironment::faux();
        let icrc_service = IcrcService::faux();
        let ic_intent_adapter = IntentAdapterImpl::faux();

        (
            transaction_service,
            action_service,
            ic_env,
            icrc_service,
            ic_intent_adapter,
        )
    }
}
