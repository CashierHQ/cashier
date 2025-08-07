// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::marker::PhantomData;

use cashier_types::{
    error::CanisterError,
    repository::{common::Chain, intent::v2::Intent, transaction::v2::Transaction},
};
use ic::intent::IcIntentAdapter;

use crate::utils::runtime::IcEnvironment;

pub mod ic;

/// Specialization for converting intents to transactions
pub trait IntentAdapter {
    fn intent_to_transactions(&self, intent: &Intent) -> Result<Vec<Transaction>, CanisterError>;
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
