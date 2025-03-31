use std::marker::PhantomData;

use cashier_types::{ActionType, Chain, Intent, Link, LinkType, Transaction};
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

#[cfg_attr(test, faux::create)]
pub struct ActionAdapterImpl<E: IcEnvironment + Clone> {
    // PhantomData tells Rust that we're conceptually storing E, even though we don't
    _phantom: PhantomData<E>,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> ActionAdapterImpl<E> {
    pub fn new() -> Self {
        Self {
            _phantom: PhantomData,
        }
    }

    pub fn action_to_intents(
        &self,
        chain: &Chain,
        input: ActionToIntentInput,
    ) -> Result<Vec<Intent>, String> {
        match chain {
            Chain::IC => {
                let ic_action_adapter: IcActionAdapter<E> = IcActionAdapter::new();
                ic_action_adapter.action_to_intents(input)
            }
        }
    }
}

#[cfg_attr(test, faux::create)]
pub struct IntentAdapterImpl<E: IcEnvironment + Clone> {
    // PhantomData tells Rust that we're conceptually storing E, even though we don't
    _phantom: PhantomData<E>,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> IntentAdapterImpl<E> {
    pub fn new() -> Self {
        Self {
            _phantom: PhantomData,
        }
    }

    pub fn intent_to_transactions(
        &self,
        chain: &Chain,
        intent: &Intent,
    ) -> Result<Vec<Transaction>, String> {
        match chain {
            Chain::IC => {
                let ic_intent_adapter: IcIntentAdapter<E> = IcIntentAdapter::new();
                ic_intent_adapter.intent_to_transactions(intent)
            }
        }
    }
}
