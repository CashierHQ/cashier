use crate::{repositories::link_intent_store, types::link::Link};

pub fn is_valid_fields_before_active(link_detail: Link) -> Result<bool, String> {
    link_detail.is_valid_fields_before_active()
}

pub fn is_intent_exist(link_id: &str) -> Result<bool, String> {
    let link_intent_create = link_intent_store::find_create_intent_by_link_id(link_id);

    match link_intent_create {
        Some(_) => Ok(true),
        None => Err("Intent not found".to_string()),
    }
}
