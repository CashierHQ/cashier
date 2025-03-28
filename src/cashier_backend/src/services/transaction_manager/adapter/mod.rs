use cashier_types::{ActionType, Intent, Link, LinkType, Transaction};
use ic::{action::IcActionAdapter, intent::IcIntentAdapter};

use crate::{types::temp_action::TemporaryAction, utils::runtime::IcEnvironment};

pub mod ic;

/// Generic adapter trait for converting between different types
pub trait Adapter<I, O> {
    fn adapt(&self, input: I) -> Result<O, String>;
}

pub struct ActionToIntentInput {
    pub action: TemporaryAction,
    pub link: Link,
}

/// Specialization for converting actions to intents
pub trait ActionAdapter {
    fn action_to_intents(&self, input: ActionToIntentInput) -> Result<Vec<Intent>, String>;

    fn handle_action_link(
        &self,
        link_type: &LinkType,
        action_type: &ActionType,
    ) -> Result<Vec<Intent>, String>;
}

/// Specialization for converting intents to transactions
pub trait IntentAdapter {
    fn intent_to_transactions(&self, intent: &Intent) -> Result<Vec<Transaction>, String>;
}

/// Adapter registry for managing different adapter implementations
pub struct AdapterRegistry<E: IcEnvironment + Clone> {
    ic_action_adapter: Option<super::adapter::ic::action::IcActionAdapter<E>>,
    ic_intent_adapter: Option<super::adapter::ic::intent::IcIntentAdapter<E>>,
}

impl<E> AdapterRegistry<E>
where
    E: crate::utils::runtime::IcEnvironment + Clone,
{
    pub fn new() -> Self {
        Self {
            ic_action_adapter: Some(IcActionAdapter::new()),
            ic_intent_adapter: Some(IcIntentAdapter::new()),
        }
    }

    pub fn register_ic_action_adapter(
        &mut self,
        adapter: super::adapter::ic::action::IcActionAdapter<E>,
    ) {
        self.ic_action_adapter = Some(adapter);
    }

    pub fn register_ic_intent_adapter(
        &mut self,
        adapter: super::adapter::ic::intent::IcIntentAdapter<E>,
    ) {
        self.ic_intent_adapter = Some(adapter);
    }

    pub fn get_action_adapter(
        &self,
        chain: cashier_types::Chain,
    ) -> Result<&dyn ActionAdapter, String> {
        match chain {
            cashier_types::Chain::IC => self
                .ic_action_adapter
                .as_ref()
                .ok_or_else(|| "IC action adapter not registered".to_string())
                .map(|adapter| adapter as &dyn ActionAdapter),
        }
    }

    pub fn get_intent_adapter(
        &self,
        chain: cashier_types::Chain,
    ) -> Result<&dyn IntentAdapter, String> {
        match chain {
            cashier_types::Chain::IC => self
                .ic_intent_adapter
                .as_ref()
                .ok_or_else(|| "IC intent adapter not registered".to_string())
                .map(|adapter| adapter as &dyn IntentAdapter),
        }
    }
}
