// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{common::Chain, intent::v2::Intent, transaction::v1::Transaction},
};
use ic::intent::IcIntentAdapter;

pub mod ic;

/// Specialization for converting intents to transactions
pub trait IntentAdapter {
    fn intent_to_transactions(
        &self,
        ts: u64,
        ntent: &Intent,
    ) -> Result<Vec<Transaction>, CanisterError>;
}

pub struct IntentAdapterImpl {}

impl IntentAdapterImpl {
    pub fn new() -> Self {
        Self {}
    }

    pub fn intent_to_transactions(
        &self,
        chain: &Chain,
        ts: u64,
        intent: &Intent,
    ) -> Result<Vec<Transaction>, CanisterError> {
        match chain {
            Chain::IC => {
                let ic_intent_adapter = IcIntentAdapter::new();
                ic_intent_adapter.intent_to_transactions(ts, intent)
            }
        }
    }
}
