use crate::{
    store::link_store,
    types::link_detail::{LinkDetail, LinkDetailUpdate, State},
};

pub fn handle_update_create_and_airdrop_detail(
    id: String,
    input: LinkDetailUpdate,
    mut link_detail: LinkDetail,
) -> Result<LinkDetail, String> {
    match link_detail.state {
        Some(State::New) | Some(State::PendingDetail) | Some(State::PendingPreview) => {
            // Update to PendingDetail
            link_detail.update(input);
            link_store::update(id.clone(), link_detail.clone());
            Ok(link_detail)
        }
        Some(State::Active) => {
            // validate input
            match is_valid_fields_before_active(&link_detail) {
                Ok(_) => {}
                Err(e) => return Err(e),
            }

            // update only state
            link_detail.state = Some(State::Active);
            link_store::update(id.clone(), link_detail.clone());
            Ok(link_detail)
        }
        Some(State::Inactive) => {
            link_detail.state = Some(State::Inactive);
            link_store::update(id.clone(), link_detail.clone());
            Ok(link_detail)
        }
        None => Err("State is not found".to_string()),
    }
}

pub fn is_valid_fields_before_active(link_detail: &LinkDetail) -> Result<bool, String> {
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
    if link_detail.actions.as_ref().map_or(true, |v| v.is_empty()) {
        return Err("actions are missing or empty".to_string());
    }
    if link_detail.template.is_none() {
        return Err("template is missing".to_string());
    }
    if link_detail.creator.as_ref().map_or(true, |s| s.is_empty()) {
        return Err("creator is missing or empty".to_string());
    }
    Ok(true)
}
