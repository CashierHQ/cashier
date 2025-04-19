use cashier_types::{
    Action, ActionIntent, ActionState, ActionType, Intent, IntentState, IntentTask, Link,
    LinkState, Transaction, TransactionState,
};

use crate::{error, types::error::CanisterError};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct ActionDomainLogic {}

#[cfg_attr(test, faux::methods)]
// Domain logic for business rules related to actions
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
            ActionType::Claim => {
                // Anyone can claim, but only if link is active
                if link.state != LinkState::Active {
                    return Err(CanisterError::ValidationErrors(
                        "Link is not active".to_string(),
                    ));
                }
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
            (ActionType::Claim, IntentTask::TransferLinkToWallet) => Ok(()),
            // Other valid combinations...
            _ => Err(CanisterError::ValidationErrors(format!(
                "Intent task {:?} is not valid for action type {:?}",
                intent.task, action.r#type
            ))),
        }
    }

    // Calculate intent state based on its transactions
    pub fn calculate_intent_state(&self, transactions: &[Transaction]) -> IntentState {
        if transactions
            .iter()
            .all(|tx| tx.state == TransactionState::Created)
        {
            return IntentState::Created;
        } else if transactions
            .iter()
            .any(|tx| tx.state == TransactionState::Fail)
        {
            error!("tx fail : {:#?}", transactions);

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
    pub fn calculate_action_state(&self, intents: &[Intent]) -> ActionState {
        if intents
            .iter()
            .all(|intent| intent.state == IntentState::Created)
        {
            return ActionState::Created;
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
