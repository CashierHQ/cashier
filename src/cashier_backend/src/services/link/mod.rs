use std::str::FromStr;

use cashier_types::{Action, Link, LinkState, LinkType, UserLink};
use uuid::Uuid;
pub mod example_data;
pub mod update;
pub mod v2;
pub mod validate_active_link;

#[cfg(test)]
pub mod __tests__;

use crate::{
    core::link::types::CreateLinkInput,
    repositories::{self, action, link_action, user_link, user_wallet},
    types::api::{PaginateInput, PaginateResult},
    warn,
};

pub fn create_new(creator: String, input: CreateLinkInput) -> Result<String, String> {
    let user_wallet_repository = user_wallet::UserWalletRepository::new();
    let user_wallet = user_wallet_repository
        .get(&creator)
        .ok_or_else(|| "User not found".to_string())?;

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

    let link_repository = repositories::link::LinkRepository::new();
    let user_link_repository = user_link::UserLinkRepository::new();

    link_repository.create(new_link);
    user_link_repository.create(new_user_link);

    Ok(link_id_str)
}

pub fn get_links_by_principal(
    principal: String,
    pagination: PaginateInput,
) -> Result<PaginateResult<Link>, String> {
    let user_wallet_repository = user_wallet::UserWalletRepository::new();
    let user_wallet = user_wallet_repository
        .get(&principal)
        .ok_or_else(|| "User not found".to_string())?;

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
    let user_link_repository = user_link::UserLinkRepository::new();
    let user_links = user_link_repository.get_links_by_user_id(user_id, pagination);

    let link_ids = user_links
        .data
        .iter()
        .map(|link_user| link_user.link_id.clone())
        .collect();

    let link_repository = repositories::link::LinkRepository::new();
    let links = link_repository.get_batch(link_ids);

    let res = PaginateResult::new(links, user_links.metadata);
    Ok(res)
}

pub fn get_link_by_id(id: String) -> Result<Link, String> {
    let link_repository = repositories::link::LinkRepository::new();
    let link = link_repository
        .get(&id)
        .ok_or_else(|| "Link not found".to_string())?;

    Ok(link)
}

pub fn get_link_action(link_id: String, action_type: String) -> Option<Action> {
    let link_action_repository = link_action::LinkActionRepository::new();
    let link_actions = link_action_repository.get_by_link_action(link_id, action_type);

    if link_actions.is_empty() {
        return None;
    }

    let action_id = link_actions.first().unwrap().action_id.clone();

    let action_repository = action::ActionRepository::new();
    let action = action_repository.get(action_id);

    action
}

pub fn is_link_creator(caller: String, link_id: &String) -> bool {
    let user_wallet_repository = user_wallet::UserWalletRepository::new();
    let user_wallet = match user_wallet_repository.get(&caller) {
        Some(u) => u,
        None => {
            warn!("User not found");
            return false;
        }
    };

    let link_repository = repositories::link::LinkRepository::new();
    match link_repository.get(&link_id) {
        None => false,
        Some(link_detail) => link_detail.creator == user_wallet.user_id,
    }
}

pub fn is_link_exist(link_id: String) -> bool {
    let link_repository = repositories::link::LinkRepository::new();
    link_repository.get(&link_id).is_some()
}
