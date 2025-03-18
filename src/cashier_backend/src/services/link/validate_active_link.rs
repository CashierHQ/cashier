use cashier_types::{ActionType, Link};

use crate::repositories::link_action;

fn is_missing_or_empty(field: Option<&String>) -> bool {
    field.map_or(true, |s| s.is_empty())
}

pub fn is_valid_fields_before_active(link: Link) -> Result<bool, String> {
    if link.id.is_empty() {
        return Err("id is empty".to_string());
    }
    if is_missing_or_empty(link.title.as_ref()) {
        return Err("title is missing or empty".to_string());
    }
    if is_missing_or_empty(link.description.as_ref()) {
        return Err("description is missing or empty".to_string());
    }
    if link.link_type.is_none() {
        return Err("link_type is missing".to_string());
    }
    if link.asset_info.is_none() {
        return Err("asset_info is missing".to_string());
    }
    if link.template.is_none() {
        return Err("template is missing".to_string());
    }

    Ok(true)
}

pub fn is_create_action_exist(link_id: String, user_id: String) -> Result<bool, String> {
    let link_action_repository = link_action::LinkActionRepository::new();
    let link_intent_create = link_action_repository.get_by_link_action(
        link_id,
        ActionType::CreateLink.to_string(),
        user_id,
    );

    if link_intent_create.is_empty() {
        return Ok(false);
    }

    Ok(true)
}
