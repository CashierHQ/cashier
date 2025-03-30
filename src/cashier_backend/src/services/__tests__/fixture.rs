use candid::Principal;
use cashier_types::{
    Action, ActionState, FromCallType, Intent, IntentState, Transaction, TransactionState,
};
use faux::when;

use crate::{
    services::{
        __tests__::tests::{
            create_dummy_action, create_dummy_intent, create_dummy_transaction,
            create_dummy_tx_protocol, generate_timestamp, MockIcEnvironment,
        },
        action::ActionService,
        transaction::TransactionService,
        transaction_manager::{adapter::AdapterRegistry, TransactionManagerService},
    },
    utils::icrc::IcrcService,
};

/// A test fixture for transaction manager tests that standardizes test setup
pub struct TransactionManagerTestFixture {
    pub transaction_service: TransactionService<MockIcEnvironment>,
    pub action_service: ActionService<MockIcEnvironment>,
    pub ic_env: MockIcEnvironment,
    pub icrc_service: IcrcService,
    pub adapter_registry: AdapterRegistry<MockIcEnvironment>,
    pub transaction_manager: TransactionManagerService<MockIcEnvironment>,
}

impl TransactionManagerTestFixture {
    /// Create a new fixture with mocked services
    pub fn new() -> Self {
        let transaction_service = TransactionService::faux();
        let action_service = ActionService::faux();
        let ic_env = MockIcEnvironment::faux();
        let icrc_service = IcrcService::faux();
        let adapter_registry = AdapterRegistry::faux();

        let transaction_manager = TransactionManagerService::new(
            transaction_service.clone(),
            action_service.clone(),
            ic_env.clone(),
            icrc_service.clone(),
            adapter_registry.clone(),
        );

        Self {
            transaction_service,
            action_service,
            ic_env,
            icrc_service,
            adapter_registry,
            transaction_manager,
        }
    }

    /// Setup a common test scenario with an action containing transactions
    pub fn setup_with_action(
        &mut self,
        action_state: ActionState,
    ) -> (Action, Vec<Intent>, Vec<Transaction>) {
        let action = create_dummy_action(action_state);
        let intent1 = create_dummy_intent(IntentState::Created);
        let intent2 = create_dummy_intent(IntentState::Created);

        let tx1 = create_dummy_transaction(TransactionState::Created);
        let tx2 = create_dummy_transaction(TransactionState::Created);

        // Configure caller ID
        when!(self.ic_env.caller)
            .then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());
        when!(self.ic_env.id)
            .then_return(Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap());
        when!(self.ic_env.time).then_return(generate_timestamp());

        (action, vec![intent1, intent2], vec![tx1, tx2])
    }

    /// Setup transactions with specific configurations (wallet or canister triggered)
    pub fn setup_transactions(
        &mut self,
        from_call_type: FromCallType,
        protocol_type: &str,
        count: usize,
    ) -> Vec<Transaction> {
        let mut transactions = Vec::with_capacity(count);

        for _ in 0..count {
            let mut tx = create_dummy_tx_protocol(TransactionState::Created, protocol_type);
            tx.from_call_type = from_call_type.clone();
            transactions.push(tx);
        }

        transactions
    }

    /// Mock transaction service to update transaction state
    pub fn mock_transaction_update(&mut self) {
        when!(self.transaction_service.update_tx_state).then_return(Ok(()));
    }

    /// Mock transaction service to get transaction by ID
    pub fn mock_get_transaction(&mut self, tx: Transaction) {
        when!(self.transaction_service.get_tx_by_id).then_return(Ok(tx));
    }
}
