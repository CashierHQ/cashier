use std::str::FromStr;

use cashier_types::{Action, Link, LinkState, LinkType, UserLink};
use uuid::Uuid;
pub mod example_data;
pub mod update;
pub mod validate_active_link;

use crate::{
    core::link::types::CreateLinkInput,
    repositories::{self, action, link, link_action, user_link, user_wallet},
    types::api::{PaginateInput, PaginateResult},
    warn,
};

pub fn create_new(creator: String, input: CreateLinkInput) -> Result<String, String> {
    let user_wallet = user_wallet::get(&creator).ok_or_else(|| "User not found".to_string())?;

    let user_id = user_wallet.user_id;

    let ts = ic_cdk::api::time();
    let id = Uuid::new_v4();
    let link_id_str = id.to_string();

    let link_type = LinkType::from_str(input.link_type.as_str())
        .map_err(|_| "Invalid link type".to_string())?;

    let new_link = Link {
        id: link_id_str.clone(),
        state: LinkState::ChooseLinkType,
        title: None,
        description: None,
        link_type: Some(link_type),
        asset_info: None,
        template: Some(cashier_types::Template::Central),
        creator: user_id.clone(),
        create_at: ts,
        metadata: None,
    };
    let new_user_link = UserLink {
        user_id: user_id.clone(),
        link_id: link_id_str.clone(),
    };

    link::create(new_link);
    user_link::create(new_user_link);

    Ok(link_id_str)
}

pub fn get_links_by_principal(
    principal: String,
    pagination: PaginateInput,
) -> Result<PaginateResult<Link>, String> {
    let user_wallet = match user_wallet::get(&principal) {
        Some(user_id) => user_id,
        None => return Err("User not found".to_string()),
    };

    let user_id = user_wallet.user_id;

    let links = match get_links_by_user_id(user_id, pagination) {
        Ok(link_users) => link_users,
        Err(e) => return Err(e),
    };

    Ok(links)
}

pub fn get_links_by_user_id(
    user_id: String,
    pagination: PaginateInput,
) -> Result<PaginateResult<Link>, String> {
    let user_links = user_link::get_links_by_user_id(user_id, pagination);

    let link_ids = user_links
        .data
        .iter()
        .map(|link_user| link_user.link_id.clone())
        .collect();

    let links = link::get_batch(link_ids);

    let res = PaginateResult::new(links, user_links.metadata);
    Ok(res)
}

pub fn get_link_by_id(id: String) -> Result<Link, String> {
    let link = match link::get(&id) {
        Some(link) => link,
        None => return Err("Link not found".to_string()),
    };

    return Ok(link);
}

pub fn get_link_action(link_id: String, action_type: String) -> Option<Action> {
    let link_actions = link_action::get_by_link_action(link_id, action_type);

    if link_actions.len() == 0 {
        return None;
    }

    let action_id = link_actions.first().unwrap().action_id.clone();

    let action = action::get(action_id);

    return action;
}

pub fn is_link_creator(caller: String, link_id: &String) -> bool {
    let user_wallet = match user_wallet::get(&caller) {
        Some(u) => u,
        None => {
            warn!("User not found");
            return false;
        }
    };

    match link::get(&link_id) {
        None => {
            return false;
        }
        Some(link_detail) => {
            let creator = link_detail.creator.clone();

            return creator == user_wallet.user_id;
        }
    };
}

pub fn is_link_exist(link_id: String) -> bool {
    repositories::link::get(&link_id).is_some()
}
