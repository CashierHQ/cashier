use std::{future::Future, pin::Pin, str::FromStr};

use cashier_types::{AssetInfo, Chain, Link, LinkState, LinkType, Template};

use crate::{
    core::link::types::{LinkStateMachineAction, LinkStateMachineActionParams, UpdateLinkInput},
    repositories::{self},
    services::{
        link::validate_active_link::{is_create_action_exist, is_valid_fields_before_active},
        transaction_manager::validate::validate_balance_with_asset_info,
    },
    types::error::CanisterError,
}; // Import the logger macro

type AsyncValidateFn =
    Box<dyn Fn(Link) -> Pin<Box<dyn Future<Output = Result<(), String>> + Send>> + Send + Sync>;

type AsyncExecuteFn = Box<
    dyn Fn(
            LinkState,
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
    new_state: LinkState,
    mut link: Link,
    params: Option<LinkStateMachineActionParams>,
) -> Pin<Box<dyn Future<Output = Result<Link, String>> + Send>> {
    Box::pin(async move {
        link.state = new_state;

        if params.is_some() {
            match params.unwrap() {
                LinkStateMachineActionParams::Update(input) => {
                    if let Some(title) = input.title {
                        link.title = Some(title);
                    }
                    if let Some(description) = input.description {
                        link.description = Some(description);
                    }
                    if let Some(link_image_url) = input.link_image_url {
                        link.metadata = Some(link.metadata.unwrap_or_default());
                        link.metadata
                            .as_mut()
                            .unwrap()
                            .insert("link_image_url".to_string(), link_image_url);
                    }
                    if let Some(nft_image) = input.nft_image {
                        link.metadata = Some(link.metadata.unwrap_or_default());
                        link.metadata
                            .as_mut()
                            .unwrap()
                            .insert("nft_image".to_string(), nft_image);
                    }
                    if let Some(asset_info) = input.asset_info {
                        link.asset_info = Some(
                            asset_info
                                .iter()
                                .map(|a| {
                                    let chain = match Chain::from_str(a.chain.as_str()) {
                                        Ok(chain) => chain,
                                        Err(_) => Chain::IC,
                                    };

                                    AssetInfo {
                                        address: a.address.clone(),
                                        chain,
                                        total_amount: a.total_amount,
                                        amount_per_claim: a.amount_per_claim,
                                        // start with 0
                                        total_claim: 0,
                                        // start with 0
                                        current_amount: 0,
                                    }
                                })
                                .collect(),
                        );
                    }
                    if let Some(template) = input.template {
                        link.template = Template::from_str(template.as_str()).ok();
                    }
                    if let Some(link_type) = input.link_type {
                        link.link_type = LinkType::from_str(link_type.as_str()).ok();
                    }
                }
            }
        }

        let link_repository = repositories::link::LinkRepository::new();
        link_repository.update(link.clone());

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
                    validate_balance_with_asset_info(&link.clone(), &caller).await?;
                    is_create_action_exist(link.id.clone())?;
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
                    let is_exist = is_create_action_exist(link.id.clone())?;
                    if is_exist {
                        Err("Action exists, cannot transition back".to_string())
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
                    let is_exist = is_create_action_exist(link.id.clone())?;
                    if is_exist {
                        Err("Action exists, cannot transition back".to_string())
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

    let current_state = link_input.state.clone();

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

            let dest = transition.dest.clone();

            match transition.execute.as_ref()(dest, link_input.clone(), input.params).await {
                Ok(link) => Ok(link),
                Err(e) => Err(CanisterError::ValidationErrors(e)),
            }
        }
        None => Err(CanisterError::ValidationErrors(
            "Invalid state transition".to_string(),
        )),
    }
}
