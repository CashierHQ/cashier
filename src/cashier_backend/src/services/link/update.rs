use crate::types::link_detail::{LinkDetail, LinkDetailUpdate, State};

pub fn handle_update_create_and_airdrop_nft(
    input: LinkDetailUpdate,
    mut link_detail: LinkDetail,
) -> Result<LinkDetail, String> {
    let state_machine_result = match input.state {
        Some(State::New) => link_detail.back_to_new(),
        Some(State::PendingDetail) => {
            if link_detail.state == Some(State::New) {
                link_detail.to_pending_detail(input)
            } else {
                link_detail.back_to_pending_detail()
            }
        }
        Some(State::PendingPreview) => link_detail.to_pending_preview(input),
        Some(State::Active) => link_detail.activate(),
        Some(State::Inactive) => link_detail.deactivate(),
        None => Err("State is not implemented".to_string()),
    };

    match state_machine_result {
        Ok(_) => return Ok(link_detail.save()),
        Err(e) => return Err(e),
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
