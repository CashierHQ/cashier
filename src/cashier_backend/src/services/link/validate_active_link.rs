use crate::{repositories::link_intent_store, types::link::Link};

pub fn is_valid_fields_before_active(link_detail: Link) -> Result<bool, String> {
    match link_detail {
        Link::NftCreateAndAirdropLink(link) => {
            if link.id.is_empty() {
                return Err("id is empty".to_string());
            }
            if link.title.as_ref().map_or(true, |s| s.is_empty()) {
                return Err("title is missing or empty".to_string());
            }
            if link.description.as_ref().map_or(true, |s| s.is_empty()) {
                return Err("description is missing or empty".to_string());
            }
            if link.nft_image.as_ref().map_or(true, |s| s.is_empty()) {
                return Err("nft_image is missing or empty".to_string());
            }
            if link.link_image_url.as_ref().map_or(true, |s| s.is_empty()) {
                return Err("link_image_url is missing or empty".to_string());
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
            if link.creator.as_ref().map_or(true, |s| s.is_empty()) {
                return Err("creator is missing or empty".to_string());
            }
            return Ok(true);
        }
    }
}

pub fn is_intent_exist(link_id: &str) -> Result<bool, String> {
    let link_intent_create = link_intent_store::find_create_intent_by_link_id(link_id);

    match link_intent_create {
        Some(_) => Ok(true),
        None => Err("Intent not found".to_string()),
    }
}
