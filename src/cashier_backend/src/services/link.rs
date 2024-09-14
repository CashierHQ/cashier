use uuid::Uuid;

use crate::{
    core::link::types::CreateLinkInput,
    store::{link_store, link_user_store, user_wallet_store},
    types::{
        api::{PaginateInput, PaginateResult},
        link_detail::LinkDetail,
    },
};

pub fn create_new(creator: String, input: CreateLinkInput) -> Result<String, String> {
    let id = Uuid::new_v4();
    let user_id = match user_wallet_store::get(&creator) {
        Some(user_id) => user_id,
        None => return Err("User not found".to_string()),
    };
    let new_link_detail = LinkDetail::create_new(id.to_string(), user_id.clone(), input.link_type);

    let ts: u64 = ic_cdk::api::time();

    let link_user_key = format!("{}#{}", user_id, id.to_string());

    link_store::create(id.to_string(), new_link_detail);
    link_user_store::create(link_user_key, ts);

    Ok(id.to_string())
}

pub fn get_links_by_user_id(
    user_id: String,
    pagination: PaginateInput,
) -> Result<PaginateResult<LinkDetail>, String> {
    let link_users = match link_user_store::get_links_by_user_id(user_id, pagination) {
        Ok(link_users) => link_users,
        Err(e) => return Err(e),
    };

    let link_ids = link_users
        .data
        .iter()
        .map(|link_user| link_user.link_id.clone())
        .collect();

    let links = link_store::get_batch(link_ids);
    let res = PaginateResult::new(links, link_users.metadata);

    Ok(res)
}

pub fn get_links_by_principal(
    principal: String,
    pagination: PaginateInput,
) -> Result<PaginateResult<LinkDetail>, String> {
    let user_id = match user_wallet_store::get(&principal) {
        Some(user_id) => user_id,
        None => return Err("User not found".to_string()),
    };

    let links = match get_links_by_user_id(user_id, pagination) {
        Ok(link_users) => link_users,
        Err(e) => return Err(e),
    };

    Ok(links)
}
