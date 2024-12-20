use std::{future::Future, pin::Pin};

use crate::{
    core::link::types::{LinkStateMachineAction, LinkStateMachineActionParams, UpdateLinkInput},
    repositories::link_store,
    services::{
        link::validate_active_link::{is_intent_exist, is_valid_fields_before_active},
        transaction::validate::validate_balance_with_asset_info,
    },
    types::{
        error::CanisterError,
        link::{link_state::LinkState, Link},
    },
}; // Import the logger macro

type AsyncValidateFn =
    Box<dyn Fn(Link) -> Pin<Box<dyn Future<Output = Result<(), String>> + Send>> + Send + Sync>;

pub struct Transition {
    pub trigger: LinkStateMachineAction,
    pub source: LinkState,
    pub dest: LinkState,
    pub requires_update: bool,
    pub validate: AsyncValidateFn,
}

pub fn get_transitions() -> Vec<Transition> {
    vec![
        // Continue transitions
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::ChooseLinkType,
            dest: LinkState::AddAssets,
            requires_update: true,
            validate: Box::new(|_| Box::pin(async { Ok(()) })),
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::AddAssets,
            dest: LinkState::CreateLink,
            requires_update: true,
            validate: Box::new(|_| Box::pin(async { Ok(()) })),
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::CreateLink,
            dest: LinkState::Active,
            requires_update: false,
            validate: Box::new(|link| {
                Box::pin(async move {
                    let caller = ic_cdk::api::caller();
                    validate_balance_with_asset_info(link.clone(), caller).await?;
                    is_intent_exist(link.get("id").unwrap().as_str())?;
                    is_valid_fields_before_active(link.clone())?;
                    Ok(())
                })
            }),
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::Active,
            dest: LinkState::Inactive,
            requires_update: false,
            validate: Box::new(|_| Box::pin(async { Ok(()) })),
        },
        // Back transitions
        Transition {
            trigger: LinkStateMachineAction::Back,
            source: LinkState::CreateLink,
            dest: LinkState::AddAssets,
            requires_update: false,
            validate: Box::new(|link| {
                Box::pin(async move {
                    if is_intent_exist(link.get("id").unwrap().as_str()).is_ok() {
                        Err("Intent exists, cannot transition back".to_string())
                    } else {
                        Ok(())
                    }
                })
            }),
        },
        Transition {
            trigger: LinkStateMachineAction::Back,
            source: LinkState::AddAssets,
            dest: LinkState::ChooseLinkType,
            requires_update: false,
            validate: Box::new(|link| {
                Box::pin(async move {
                    if is_intent_exist(link.get("id").unwrap().as_str()).is_ok() {
                        Err("Intent exists, cannot transition back".to_string())
                    } else {
                        Ok(())
                    }
                })
            }),
        },
    ]
}

pub async fn handle_update_link(
    input: UpdateLinkInput,
    mut link_input: Link,
) -> Result<Link, CanisterError> {
    let transitions = get_transitions();

    let current_state = match link_input.get("state") {
        Some(state) => {
            let state = state.as_str();
            match LinkState::from_string(state) {
                Ok(state) => state,
                Err(e) => return Err(CanisterError::ValidationErrors(e)),
            }
        }
        None => {
            return Err(CanisterError::ValidationErrors(
                "state is missing".to_string(),
            ))
        }
    };

    let state_machine_result = transitions.iter().find(|t| {
        let is_match_source = t.source == current_state;

        let is_match_trigger = match LinkStateMachineAction::from_string(input.action.as_str()) {
            Ok(action) => t.trigger == action,
            Err(_) => false,
        };

        is_match_source && is_match_trigger
    });

    match state_machine_result {
        Some(transition) => {
            match (transition.validate)(link_input.clone()).await {
                Ok(_) => {}
                Err(e) => return Err(CanisterError::ValidationErrors(e)),
            }

            // update state
            link_input.set("state", transition.dest.to_string());

            // if requires update, update the link detail with the input params
            if transition.requires_update {
                if let Some(params) = input.params {
                    match params {
                        LinkStateMachineActionParams::Update(params) => {
                            link_input.update(params.to_link_detail_update());
                        }
                    }
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "params is missing".to_string(),
                    ));
                }
            }

            // update link to db
            link_store::update(link_input.to_persistence());

            Ok(link_input)
        }
        None => Err(CanisterError::ValidationErrors(
            "Invalid state transition".to_string(),
        )),
    }
}
