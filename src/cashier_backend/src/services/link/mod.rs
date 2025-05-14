use uuid::Uuid;
pub mod create_example_link;
pub mod example_data;
pub mod update;
pub mod validate_active_link;

use crate::{
    core::link::types::{CreateLinkInput, GetLinkOptions, GetLinkResp},
    repositories::{link_store, user_link_store, user_wallet_store},
    types::{
        api::{PaginateInput, PaginateResult},
        intent::IntentType,
        link::Link,
        user_link::UserLink,
    },
    warn,
};

use super::transaction::get::get_create_intent;

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

pub fn get_link_by_id(id: String, options: Option<GetLinkOptions>) -> Result<GetLinkResp, String> {
    let link = match link_store::get(&id) {
        Some(link) => Some(Link::from_persistence(link)),
        None => return Err("Link not found".to_string()),
    };

    if options.is_none() {
        return Ok(GetLinkResp {
            link: link.unwrap(),
            intent: None,
        });
    }

    match IntentType::from_string(options.unwrap().intent_type.as_str()) {
        Ok(intent_type) => match intent_type {
            IntentType::Create => {
                let intent_resp = match get_create_intent(id.clone()) {
                    Ok(intent_resp) => intent_resp,
                    Err(_) => {
                        return Ok(GetLinkResp {
                            link: link.unwrap(),
                            intent: None,
                        });
                    }
                };
                return Ok(GetLinkResp {
                    link: link.unwrap(),
                    intent: Some(intent_resp),
                });
            }
            _ => return Err("Intent type not supported".to_string()),
        },
        Err(_) => {
            return Ok(GetLinkResp {
                link: link.unwrap(),
                intent: None,
            })
        }
    };
}

pub fn is_link_creator(caller: String, id: &String) -> bool {
    let user_id = match user_wallet_store::get(&caller) {
        Some(user_id) => user_id,
        None => {
            warn!("User not found");
            return false;
        }
    };

    match link_store::get(&id) {
        None => {
            warn!("Link not found");
            return false;
        }
        Some(link_detail) => {
            let creator = link_detail.creator.clone().unwrap();
            if creator != user_id {
                warn!("User is not the creator of the link");
                return false;
            }
            return true;
        }
    };
}
