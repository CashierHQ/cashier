use crate::{
    core::link::types::{LinkStateMachineAction, LinkStateMachineActionParams, UpdateLinkInput},
    repositories::link_store,
    types::link::{Link, State},
    utils::logger,
};

pub fn handle_update_create_and_airdrop_nft(
    input: UpdateLinkInput,
    mut link: Link,
) -> Result<Link, String> {
    let state_machine_result = match input.action {
        LinkStateMachineAction::Update => {
            if input.params.is_none() {
                return Err("params is missing".to_string());
            }

            match input.params.unwrap() {
                LinkStateMachineActionParams::Update(link_detail_update) => {
                    match link_detail_update.state {
                        Some(State::New) => {
                            link.update(link_detail_update.to_link_detail_update());
                            Ok(link)
                        }
                        Some(State::PendingDetail) => {
                            link.update(link_detail_update.to_link_detail_update());
                            Ok(link)
                        }
                        Some(State::PendingPreview) => {
                            link.update(link_detail_update.to_link_detail_update());
                            Ok(link)
                        }
                        Some(State::Active) => Err("State Active is not allowed".to_string()),
                        Some(State::Inactive) => Err("State Inactive is not allowed".to_string()),
                        None => Err("State is not implemented".to_string()),
                    }
                }
            }
        }
        LinkStateMachineAction::Active => {
            link.activate();
            Ok(link.clone())
        }
        LinkStateMachineAction::Inactive => {
            link.deactivate();
            Ok(link.clone())
        }
    };

    match state_machine_result {
        Ok(updated_link) => {
            return {
                link_store::update(updated_link.to_persistence());
                Ok(updated_link)
            }
        }
        Err(e) => {
            return {
                logger::error(&format!("Error to update link {:?}", e));
                Err(e)
            }
        }
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
