use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::CreateActionResult,
    repository::{action::v1::ActionType, link::v1::Link},
};
use std::{fmt::Debug, future::Future, pin::Pin};

pub trait LinkV2: Debug {
    /// Get the underlying link model
    /// # Returns
    /// * `Link` - The link model
    fn get_link_model(&self) -> Link;

    /// Create an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// * `created_at_ts` - The timestamp when the action is created
    /// # Returns
    /// * `CreateActionResult` - The result containing the created action and associated intents and transactions
    /// # Errors
    /// * `CanisterError` - If there is an error during action creation
    fn create_action(
        &self,
        caller: Principal,
        action: ActionType,
        created_at_ts: u64,
    ) -> Result<CreateActionResult, CanisterError>;

    /// Publish the link, changing its state to ACTIVE
    /// # Returns
    /// * `Link` - The updated link model after publishing
    /// # Errors
    /// * `CanisterError` - If there is an error during publishing
    fn activate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("activate not implemented")) })
    }
}

pub trait LinkV2State: Debug {
    /// Publish the link, changing its state to ACTIVE
    /// # Returns
    /// * `Link` - The updated link model after publishing
    /// # Errors
    /// * `CanisterError` - If there is an error during publishing
    fn activate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("activate not implemented")) })
    }
}
