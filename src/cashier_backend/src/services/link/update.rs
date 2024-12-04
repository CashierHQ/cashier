use crate::{
    core::link::types::{LinkStateMachineAction, LinkStateMachineActionParams, UpdateLinkInput},
    repositories::link_store,
    types::link::{Link, LinkState},
};

#[derive(Debug, Clone)]
pub struct Transition {
    pub trigger: LinkStateMachineAction,
    pub source: LinkState,
    pub dest: LinkState,
    pub requires_update: bool,
}

pub fn get_transitions() -> Vec<Transition> {
    vec![
        // Continue transitions
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::ChooseTemplate,
            dest: LinkState::AddAsset,
            requires_update: true,
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::AddAsset,
            dest: LinkState::CreateLink,
            requires_update: true,
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::CreateLink,
            dest: LinkState::Active,
            requires_update: false,
        },
        Transition {
            trigger: LinkStateMachineAction::Continue,
            source: LinkState::Active,
            dest: LinkState::Inactive,
            requires_update: false,
        },
        // Back transitions
        Transition {
            trigger: LinkStateMachineAction::Back,
            source: LinkState::CreateLink,
            dest: LinkState::AddAsset,
            requires_update: false,
        },
        Transition {
            trigger: LinkStateMachineAction::Back,
            source: LinkState::AddAsset,
            dest: LinkState::ChooseTemplate,
            requires_update: false,
        },
    ]
}

pub fn handle_update_create_and_airdrop_nft(
    input: UpdateLinkInput,
    mut link: Link,
) -> Result<Link, String> {
    let transitions = get_transitions();

    let current_state = match link.state {
        Some(state) => LinkState::from_string(&state),
        None => return Err("State is missing".to_string()),
    };

    let state_machine_result = transitions
        .iter()
        .find(|t| t.source == current_state && t.trigger == input.action);

    match state_machine_result {
        Some(transition) => {
            link.state = Some(transition.dest.to_string());
            if transition.requires_update {
                if let Some(params) = input.params {
                    match params {
                        LinkStateMachineActionParams::Update(params) => {
                            link.update(params.to_link_detail_update());
                        }
                    }
                } else {
                    return Err("params is missing".to_string());
                }
            }
            link_store::update(link.to_persistence());
            Ok(link)
        }
        None => Err("Invalid state transition".to_string()),
    }
}

pub fn is_valid_fields_before_active(link_detail: &Link) -> Result<bool, String> {
    if link_detail.id.is_empty() {
        return Err("id is empty".to_string());
    }
    if link_detail.title.as_ref().map_or(true, |s| s.is_empty()) {
        return Err("title is missing or empty".to_string());
    }
    if link_detail
        .description
        .as_ref()
        .map_or(true, |s| s.is_empty())
    {
        return Err("description is missing or empty".to_string());
    }
    if link_detail.image.as_ref().map_or(true, |s| s.is_empty()) {
        return Err("image is missing or empty".to_string());
    }
    if link_detail.link_type.is_none() {
        return Err("link_type is missing".to_string());
    }
    if link_detail.asset_info.is_none() {
        return Err("asset_info is missing".to_string());
    }
    if link_detail.template.is_none() {
        return Err("template is missing".to_string());
    }
    if link_detail.creator.as_ref().map_or(true, |s| s.is_empty()) {
        return Err("creator is missing or empty".to_string());
    }
    Ok(true)
}
