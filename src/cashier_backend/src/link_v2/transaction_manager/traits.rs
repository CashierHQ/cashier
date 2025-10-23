use cashier_backend_types::{
    error::CanisterError,
    link_v2::action_result::{CreateActionResult, ProcessActionResult},
    repository::{action::v1::Action, intent::v1::Intent},
};

pub trait TransactionManager {
    fn create_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
        created_at: u64,
    ) -> Result<CreateActionResult, CanisterError>;

    fn process_action(
        &self,
        action: Action,
        intents: Vec<Intent>,
    ) -> Result<ProcessActionResult, CanisterError>;
}
