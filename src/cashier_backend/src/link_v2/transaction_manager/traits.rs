use cashier_backend_types::{
    error::CanisterError,
    link_v2::action_result::{CreateActionResult, ProcessActionResult},
    repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
};
use std::collections::HashMap;

pub trait TransactionManager {
    /// Create transactions and assemble ICRC-112 requests for the given action and intents
    /// # Arguments
    /// * `action` - The action for which transactions are to be created
    /// * `intents` - The intents associated with the action
    /// # Returns
    /// * `CreateActionResult` - The result containing the created action, intents, transactions, and ICRC-112 requests
    /// # Errors
    /// * `CanisterError` - If there is an error during transaction creation
    async fn create_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
    ) -> Result<CreateActionResult, CanisterError>;

    async fn process_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Result<ProcessActionResult, CanisterError>;
}
