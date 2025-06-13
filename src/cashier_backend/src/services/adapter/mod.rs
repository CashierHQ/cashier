// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use std::marker::PhantomData;

use cashier_types::{
    intent::v2::Intent, transaction::v2::Transaction, ActionType, Chain, Link, LinkType,
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
    ) -> Result<Vec<Transaction>, CanisterError> {
        match chain {
            Chain::IC => {
                let ic_intent_adapter: IcIntentAdapter<E> = IcIntentAdapter::new();
                ic_intent_adapter.intent_to_transactions(intent)
            }
        }
    }
}
