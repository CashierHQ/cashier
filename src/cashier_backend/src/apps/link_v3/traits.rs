use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::{
        action_result::{CreateActionResult, ProcessActionResult},
        link_result::{LinkCreateActionResult, LinkProcessActionResult},
    },
    repository::{action::v3::ActionV3, intent::v3::IntentV3, transaction::v1::Transaction},
};
use std::collections::HashMap;
use std::pin::Pin;

pub trait LinkV3Instance {
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
        action: ActionV3,
        intents: Vec<IntentV3>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>>;

    fn process_action(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>>;
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
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkCreateActionResult, CanisterError>>>>;

    fn process_action(
        &self,
        caller: Principal,
        action: ActionV3,
        intents: Vec<IntentV3>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<LinkProcessActionResult, CanisterError>>>>;
}
