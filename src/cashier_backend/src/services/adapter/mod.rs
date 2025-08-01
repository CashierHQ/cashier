// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::marker::PhantomData;

use cashier_types::repository::{
    action::v1::ActionType,
    common::Chain,
    intent::v2::Intent,
    link::v1::{Link, LinkType},
    transaction::v2::Transaction,
};
use ic::{action::IcActionAdapter, intent::IcIntentAdapter};

use crate::{
    types::{error::CanisterError, temp_action::TemporaryAction},
    utils::runtime::IcEnvironment,
};

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
    fn intent_to_transactions(&self, intent: &Intent) -> Result<Vec<Transaction>, CanisterError>;
}

pub struct ActionAdapterImpl<E: IcEnvironment + Clone> {
    // PhantomData tells Rust that we're conceptually storing E, even though we don't
    _phantom: PhantomData<E>,
}

impl<E: IcEnvironment + Clone> Default for ActionAdapterImpl<E> {
    fn default() -> Self {
        Self::new()
    }
}

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

pub struct IntentAdapterImpl<E: IcEnvironment + Clone> {
    // PhantomData tells Rust that we're conceptually storing E, even though we don't
    _phantom: PhantomData<E>,
}

impl<E: IcEnvironment + Clone> Default for IntentAdapterImpl<E> {
    fn default() -> Self {
        Self::new()
    }
}

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
    ) -> Result<Vec<Transaction>, CanisterError> {
        match chain {
            Chain::IC => {
                let ic_intent_adapter: IcIntentAdapter<E> = IcIntentAdapter::new();
                ic_intent_adapter.intent_to_transactions(intent)
            }
        }
    }
}
