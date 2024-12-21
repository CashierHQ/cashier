use ic_cdk::{query, update};

use crate::{
    core::{
        guard::is_not_anonymous, link_type::LinkType, GetLinkOptions, GetLinkResp, PaginateResult,
        UpdateLinkInput,
    },
    error,
    services::{
        self,
        link::{create_new, is_link_creator, update::handle_update_link},
    },
    types::{api::PaginateInput, error::CanisterError, link::Link},
};

use super::types::CreateLinkInput;

#[query(guard = "is_not_anonymous")]
async fn get_links(input: Option<PaginateInput>) -> Result<PaginateResult<Link>, String> {
    let caller = ic_cdk::api::caller();

    match services::link::get_links_by_principal(caller.to_text(), input.unwrap_or_default()) {
        Ok(links) => Ok(links),
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
    services::link::get_link_by_id(id, options)
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
async fn update_link(input: UpdateLinkInput) -> Result<Link, CanisterError> {
    match input.validate() {
        Ok(_) => (),
        Err(e) => return Err(CanisterError::HandleApiError(e)),
    }

    let creator = ic_cdk::api::caller();

    // get link type
    let rsp = match services::link::get_link_by_id(input.id.clone(), None) {
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

    let link_type = rsp.link.get("link_type");

    if link_type.is_none() {
        return Err(CanisterError::HandleApiError(
            "Link type is missing".to_string(),
        ));
    }

    let link_type_str = link_type.unwrap();
    match LinkType::from_string(&link_type_str) {
        Ok(LinkType::NftCreateAndAirdrop) => match handle_update_link(input, rsp.link).await {
            Ok(link) => Ok(link),
            Err(e) => {
                error!("Failed to update link: {:#?}", e);
                Err(e)
            }
        },
        Ok(LinkType::TipLink) => match handle_update_link(input, rsp.link).await {
            Ok(link) => Ok(link),
            Err(e) => {
                error!("Failed to update link: {:#?}", e);
                Err(e)
            }
        },

        Err(_) => Err(CanisterError::HandleApiError(
            "Invalid link type".to_string(),
        )),
    }
}
