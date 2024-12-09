use uuid::Uuid;
pub mod create_example_link;
pub mod example_data;
pub mod update;
pub mod validate_active_link;

use crate::{
    core::link::types::{CreateLinkInput, GetLinkResp},
    repositories::{
        action_store, link_action_store, link_store, user_link_store, user_wallet_store,
    },
    types::{
        action::ActionType,
        api::{PaginateInput, PaginateResult},
        link::Link,
        user_link::UserLink,
    },
    utils::logger,
};

pub fn create_new(creator: String, input: CreateLinkInput) -> Result<String, String> {
    let user_id = match user_wallet_store::get(&creator) {
        Some(user_id) => user_id,
        None => return Err("User not found".to_string()),
    };

    let ts = ic_cdk::api::time();
    let id = Uuid::new_v4();
    let link_id_str = id.to_string();

    let new_link = Link::create_new(
        link_id_str.clone(),
        user_id.clone(),
        input.link_type.to_string(),
        ts,
    );
    let new_user_link = UserLink::new(user_id, link_id_str.clone(), ts);

    let new_link_persistence = new_link.to_persistence();
    let new_user_link_persistence = new_user_link.to_persistence();

    link_store::create(new_link_persistence);
    user_link_store::create(new_user_link_persistence);

    Ok(link_id_str)
}

pub fn get_links_by_principal(
    principal: String,
    pagination: PaginateInput,
) -> Result<PaginateResult<Link>, String> {
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

pub fn get_links_by_user_id(
    user_id: String,
    pagination: PaginateInput,
) -> Result<PaginateResult<Link>, String> {
    let user_links = match user_link_store::get_links_by_user_id(user_id, pagination, None) {
        Ok(link_users) => link_users,
        Err(e) => return Err(e),
    };

    let link_ids = user_links
        .data
        .iter()
        .map(|link_user| link_user.split_pk().1)
        .collect();

    let links_persistence = link_store::get_batch(link_ids);

    let link_general = links_persistence
        .iter()
        .map(|link| Link::from_persistence(link.clone()))
        .collect::<Vec<Link>>();

    let res = PaginateResult::new(link_general, user_links.metadata);
    Ok(res)
}

pub fn get_link_by_id(id: String) -> Option<GetLinkResp> {
    let link = match link_store::get(&id) {
        Some(link) => Some(Link::from_persistence(link)),
        None => return None,
    };

    let link_action_prefix = format!("link#{}#type#{}action#", id, ActionType::Create.to_string());

    let link_action_create = link_action_store::find_with_prefix(link_action_prefix.as_str());

    if link_action_create.is_empty() {
        return Some(GetLinkResp {
            link: link.unwrap(),
            action_create: None,
        });
    }

    if let Some(first_action) = link_action_create.first().cloned() {
        let action = action_store::get(&first_action.action_id);
        Some(GetLinkResp {
            link: link.unwrap(),
            action_create: action,
        })
    } else {
        Some(GetLinkResp {
            link: link.unwrap(),
            action_create: None,
        })
    }
}

pub fn is_link_creator(caller: String, id: &String) -> bool {
    let user_id = match user_wallet_store::get(&caller) {
        Some(user_id) => user_id,
        None => {
            logger::error(&format!("User not found"));
            return false;
        }
    };

    match link_store::get(&id) {
        None => {
            logger::error(&format!("Link not found"));
            return false;
        }
        Some(link_detail) => {
            let creator = link_detail.creator.clone().unwrap();
            if creator != user_id {
                logger::error(&format!("Caller is not creator"));
                return false;
            }
            return true;
        }
    };
}
