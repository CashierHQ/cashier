use candid::Principal;
use cashier_backend_types::{error::CanisterError, link_v3::link_result::LinkCreateActionResult};
use cashier_shared::types::Action as ActionShared;
use std::pin::Pin;

pub trait LinkV3 {
    /// Create an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// # Returns
    /// * `LinkCreateActionResult` - The result containing the updated link and action creation result
    /// # Errors
    /// * `CanisterError` - If there is an error during action creation
    fn create_action(
        &self,
        caller: Principal,
        action: ActionShared,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>>;
}

pub trait LinkV3State {
    /// Create an action associated with the link
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `action` - The type of action to be created
    /// # Returns
    /// * `LinkCreateActionResult` - The result containing the updated link and action creation result
    /// # Errors
    /// * `CanisterError` - If there is an error during action creation
    fn create_action(
        &self,
        _caller: Principal,
        _action: ActionShared,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("create_action not implemented")) })
    }
}
