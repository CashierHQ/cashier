// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::repository::{
    action::v1::ActionState,
    intent::v2::{Intent, IntentState},
    transaction::v2::{Transaction, TransactionState},
};

#[derive(Clone)]
pub struct ActionDomainLogic {}

// Domain logic for business rules related to actions
impl Default for ActionDomainLogic {
    fn default() -> Self {
        Self::new()
    }
}

impl ActionDomainLogic {
    pub fn new() -> Self {
        Self {}
    }

    // Calculate intent state based on its transactions
    pub fn roll_up_intent_state(&self, transactions: &[Transaction]) -> IntentState {
        if transactions
            .iter()
            .all(|tx| tx.state == TransactionState::Created)
        {
            IntentState::Created
        } else if transactions
            .iter()
            .any(|tx| tx.state == TransactionState::Fail)
        {
            return IntentState::Fail;
        } else if transactions
            .iter()
            .all(|tx| tx.state == TransactionState::Success)
        {
            return IntentState::Success;
        } else {
            return IntentState::Processing;
        }
    }

    // Calculate action state based on intents
    pub fn roll_up_action_state(&self, intents: &[Intent]) -> ActionState {
        if intents
            .iter()
            .all(|intent| intent.state == IntentState::Created)
        {
            ActionState::Created
        } else if intents
            .iter()
            .any(|intent| intent.state == IntentState::Fail)
        {
            return ActionState::Fail;
        } else if intents
            .iter()
            .all(|intent| intent.state == IntentState::Success)
        {
            return ActionState::Success;
        } else {
            return ActionState::Processing;
        }
    }
}
