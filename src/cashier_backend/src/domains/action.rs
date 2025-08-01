// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::{
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        action_intent::v1::ActionIntent,
        intent::v2::{Intent, IntentState, IntentTask},
        link::v1::{Link, LinkState},
        transaction::v2::{Transaction, TransactionState},
    },
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

    // Validate action creation
    pub fn validate_action(&self, action: &Action, link: &Link) -> Result<(), CanisterError> {
        // Validate action creator
        match action.r#type {
            ActionType::CreateLink | ActionType::Withdraw => {
                if action.creator != link.creator {
                    return Err(CanisterError::Unauthorized(
                        "Only the link creator can perform this action".to_string(),
                    ));
                }
            }
            ActionType::Use => {
                // Anyone can claim, but only if link is active
                if link.state != LinkState::Active {
                    return Err(CanisterError::ValidationErrors(
                        "Link is not active".to_string(),
                    ));
                }
            }
            _ => {
                return Err(CanisterError::ValidationErrors(
                    "Unsupported action type".to_string(),
                ));
            }
        }

        Ok(())
    }

    // Domain logic for associating intents with actions
    pub fn associate_intents(
        &self,
        action: &Action,
        intents: &[Intent],
    ) -> Result<Vec<ActionIntent>, CanisterError> {
        let mut action_intents = Vec::new();

        for intent in intents {
            // Validate intent is compatible with this action
            self.validate_intent_for_action(action, intent)?;

            action_intents.push(ActionIntent {
                action_id: action.id.clone(),
                intent_id: intent.id.clone(),
            });
        }

        Ok(action_intents)
    }

    // Domain logic for checking if an intent is valid for an action
    pub fn validate_intent_for_action(
        &self,
        action: &Action,
        intent: &Intent,
    ) -> Result<(), CanisterError> {
        match (&action.r#type, &intent.task) {
            (ActionType::CreateLink, IntentTask::TransferWalletToLink) => Ok(()),
            (ActionType::CreateLink, IntentTask::TransferWalletToTreasury) => Ok(()),
            (ActionType::Use, IntentTask::TransferLinkToWallet) => Ok(()),
            // Other valid combinations...
            _ => Err(CanisterError::ValidationErrors(format!(
                "Intent task {:?} is not valid for action type {:?}",
                intent.task, action.r#type
            ))),
        }
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
