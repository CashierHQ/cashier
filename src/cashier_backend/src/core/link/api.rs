use std::str::FromStr;

use cashier_types::{ActionType, LinkType};
use ic_cdk::{query, update};

use crate::{
    core::{
        action::{
            api::create_action,
            types::{ActionDto, CreateActionInput, ProcessActionInput},
        },
        guard::is_not_anonymous,
        GetLinkOptions, GetLinkResp, LinkDto, PaginateResult, UpdateLinkInput,
    },
    error,
    services::{
        self,
        link::{create_new, is_link_creator, update::handle_update_link},
        transaction_manager::{TransactionManagerService, UpdateActionArgs},
    },
    types::{api::PaginateInput, error::CanisterError},
    utils::runtime::RealIcEnvironment,
};

use super::types::CreateLinkInput;

#[query(guard = "is_not_anonymous")]
async fn get_links(input: Option<PaginateInput>) -> Result<PaginateResult<LinkDto>, String> {
    let caller = ic_cdk::api::caller();

    match services::link::get_links_by_principal(caller.to_text(), input.unwrap_or_default()) {
        Ok(links) => return Ok(links.map(|link| return LinkDto::from(link))),
        Err(e) => {
            return {
                error!("Failed to get links: {}", e);
                Err(e)
            }
        }
    }
}

#[query]
async fn get_link(id: String, options: Option<GetLinkOptions>) -> Result<GetLinkResp, String> {
    let caller = ic_cdk::api::caller();

    let is_valid_creator = is_link_creator(caller.to_text(), &id);

    let action_type: Option<ActionType> = match options {
        Some(options) => match ActionType::from_str(&options.action_type) {
            Ok(link_type) => match link_type {
                ActionType::CreateLink => Some(link_type),
                ActionType::Withdraw => Some(link_type),
                ActionType::Claim => return Err("Invalid action type".to_string()),
            },
            Err(_) => {
                return Err("Invalid action type".to_string());
            }
        },
        None => None,
    };

    let link = services::link::get_link_by_id(id.clone())?;

    // if not link creator doesn't allow get create link and withdraw action
    let action = match action_type {
        Some(action_type) => match action_type {
            ActionType::CreateLink => {
                if is_valid_creator {
                    Some(action_type)
                } else {
                    None
                }
            }
            ActionType::Withdraw => {
                if is_valid_creator {
                    Some(action_type)
                } else {
                    None
                }
            }
            ActionType::Claim => None,
        },
        None => None,
    };

    let action = match action {
        Some(action_type) => services::link::get_link_action(id, action_type.to_string()),
        None => None,
    };

    let action_dto = match action {
        Some(action) => {
            let intents = services::action::get_intents_by_action_id(action.id.clone());
            Some(ActionDto::from(action, intents))
        }
        None => None,
    };

    return Ok(GetLinkResp {
        link: LinkDto::from(link),
        action: action_dto,
    });
}

#[update(guard = "is_not_anonymous")]
async fn create_link(input: CreateLinkInput) -> Result<String, CanisterError> {
    let creator = ic_cdk::api::caller();

    let id = create_new(creator.to_text(), input);
    match id {
        Ok(id) => Ok(id),
        Err(e) => {
            error!("Failed to create link: {}", e);
            Err(CanisterError::HandleApiError(e))
        }
    }
}

#[update(guard = "is_not_anonymous")]
async fn update_link(input: UpdateLinkInput) -> Result<LinkDto, CanisterError> {
    match input.validate() {
        Ok(_) => (),
        Err(e) => return Err(CanisterError::HandleApiError(e)),
    }

    let creator = ic_cdk::api::caller();

    // get link type
    let link = match services::link::get_link_by_id(input.id.clone()) {
        Ok(rsp) => rsp,
        Err(e) => {
            error!("Failed to get link: {:#?}", e);
            return Err(CanisterError::HandleApiError("Link not found".to_string()));
        }
    };

    match is_link_creator(creator.to_text(), &input.id) {
        true => (),
        false => {
            return Err(CanisterError::HandleApiError(
                "Caller are not the creator of this link".to_string(),
            ))
        }
    }

    let link_type = link.link_type.clone();

    if link_type.is_none() {
        return Err(CanisterError::HandleApiError(
            "Link type is missing".to_string(),
        ));
    }

    let link_type_str = link_type.unwrap();
    match link_type_str {
        LinkType::NftCreateAndAirdrop => match handle_update_link(input, link).await {
            Ok(l) => Ok(LinkDto::from(l)),
            Err(e) => {
                error!("Failed to update link: {:#?}", e);
                Err(e)
            }
        },
        LinkType::TipLink => match handle_update_link(input, link).await {
            Ok(l) => Ok(LinkDto::from(l)),
            Err(e) => {
                error!("Failed to update link: {:#?}", e);
                Err(e)
            }
        },
        // _ => Err(CanisterError::HandleApiError(
        //     "Invalid link type".to_string(),
        // )),
    }
}

#[update(guard = "is_not_anonymous")]
pub async fn process_action(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
    if input.action_id.is_empty() {
        // create empty action
        // assemble intent
        // enrich intent
        // call tx manager create action
        return create_action(CreateActionInput {
            action_type: input.action_type.clone(),
            link_id: input.link_id.clone(),
            params: input.params.clone(),
        })
        .await;
    } else {
        let action_id = input.action_id.clone();
        let link_id = input.link_id.clone();
        let external = false;

        let transaction_manager: TransactionManagerService<RealIcEnvironment> =
            TransactionManagerService::get_instance();

        let args = UpdateActionArgs {
            action_id: action_id.clone(),
            link_id: link_id.clone(),
            external,
        };

        transaction_manager.update_action(args).await
    }
}
