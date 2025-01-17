use std::{future::Future, pin::Pin};

use crate::{
    core::link::types::{LinkStateMachineAction, LinkStateMachineActionParams, UpdateLinkInput},
    repositories::link_store,
    services::{
        link::validate_active_link::{is_intent_exist, is_valid_fields_before_active},
        transaction_manager::validate::validate_balance_with_asset_info,
    },
    types::{
        error::CanisterError,
        link::{link_state::LinkState, Link},
    },
}; // Import the logger macro

type AsyncValidateFn =
    Box<dyn Fn(Link) -> Pin<Box<dyn Future<Output = Result<(), String>> + Send>> + Send + Sync>;

type AsyncExecuteFn = Box<
    dyn Fn(
            String,
            Link,
            Option<LinkStateMachineActionParams>,
        ) -> Pin<Box<dyn Future<Output = Result<Link, String>> + Send>>
        + Send
        + Sync,
>;

pub struct Transition {
    pub trigger: LinkStateMachineAction,
    pub source: LinkState,
    pub dest: LinkState,
    pub validate: Option<AsyncValidateFn>,
    pub execute: AsyncExecuteFn,
}

fn transition_function(
    state: String,
    mut link: Link,
    params: Option<LinkStateMachineActionParams>,
) -> Pin<Box<dyn Future<Output = Result<Link, String>> + Send>> {
    Box::pin(async move {
        link.set("state", state);

        if params.is_some() {
            match params.unwrap() {
                LinkStateMachineActionParams::Update(params) => {
                    link.update(params.to_link_detail_update());
                }
            }
        }
        link_store::update(link.to_persistence());

        Ok(link)
    })
}

pub fn get_transitions() -> Vec<Transition> {
    vec![
        // Continue transitions
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::ChooseLinkType,
            dest: LinkState::AddAssets,
            validate: None,
            execute: Box::new(transition_function),
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::AddAssets,
            dest: LinkState::CreateLink,
            validate: None,
            execute: Box::new(transition_function),
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::CreateLink,
            dest: LinkState::Active,
            validate: Some(Box::new(|link: Link| {
                Box::pin(async move {
                    let caller = ic_cdk::api::caller();
                    validate_balance_with_asset_info(link.clone(), caller).await?;
                    is_intent_exist(link.get("id").unwrap().as_str())?;
                    is_valid_fields_before_active(link.clone())?;
                    Ok(())
                })
            })),
            execute: Box::new(transition_function),
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::Active,
            dest: LinkState::Inactive,
            validate: None,
            execute: Box::new(transition_function),
        },
        // Back transitions
        Transition {
            trigger: LinkStateMachineAction::Back,
            source: LinkState::CreateLink,
            dest: LinkState::AddAssets,
            validate: Some(Box::new(|link| {
                Box::pin(async move {
                    if is_intent_exist(link.get("id").unwrap().as_str()).is_ok() {
                        Err("Intent exists, cannot transition back".to_string())
                    } else {
                        Ok(())
                    }
                })
            })),
            execute: Box::new(transition_function),
        },
        Transition {
            trigger: LinkStateMachineAction::Back,
            source: LinkState::AddAssets,
            dest: LinkState::ChooseLinkType,
            validate: Some(Box::new(|link| {
                Box::pin(async move {
                    if is_intent_exist(link.get("id").unwrap().as_str()).is_ok() {
                        Err("Intent exists, cannot transition back".to_string())
                    } else {
                        Ok(())
                    }
                })
            })),
            execute: Box::new(transition_function),
        },
    ]
}

pub async fn handle_update_link(
    input: UpdateLinkInput,
    link_input: Link,
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
            if transition.validate.is_some() {
                match (transition.validate.as_ref().unwrap())(link_input.clone()).await {
                    Ok(_) => {}
                    Err(e) => return Err(CanisterError::ValidationErrors(e)),
                }
            }

            let dest = transition.dest.to_string();

            match transition.execute.as_ref()(dest, link_input.clone(), input.params).await {
                Ok(link) => {
                    return Ok(link);
                }
                Err(e) => return Err(CanisterError::ValidationErrors(e)),
            }
        }
        None => Err(CanisterError::ValidationErrors(
            "Invalid state transition".to_string(),
        )),
    }
}
