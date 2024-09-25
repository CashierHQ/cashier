use ic_cdk::{query, update};

use crate::{
    core::{guard::is_not_anonymous, LinkType, PaginateResult, UpdateLinkInput},
    services::{
        self,
        link::{create_new, is_link_creator, update::handle_update_create_and_airdrop_nft},
    },
    types::{api::PaginateInput, error::CanisterError, link_detail::LinkDetail},
    utils::logger,
};

use super::types::CreateLinkInput;

#[query(guard = "is_not_anonymous")]
async fn get_links(input: Option<PaginateInput>) -> Result<PaginateResult<LinkDetail>, String> {
    let caller = ic_cdk::api::caller();

    match services::link::get_links_by_principal(caller.to_text(), input.unwrap_or_default()) {
        Ok(links) => Ok(links),
        Err(e) => {
            return {
                logger::error(&format!("Failed to get links: {}", e));
                Err(e)
            }
        }
    }
}

#[query]
async fn get_link(id: String) -> Result<LinkDetail, String> {
    match services::link::get_link_by_id(id) {
        Some(link) => Ok(link),
        None => Err("Link not found".to_string()),
    }
}

#[update(guard = "is_not_anonymous")]
async fn create_link(input: CreateLinkInput) -> Result<String, CanisterError> {
    let creator = ic_cdk::api::caller();

    let id = create_new(creator.to_text(), input);
    match id {
        Ok(id) => Ok(id),
        Err(e) => {
            logger::error(&format!("Failed to create link: {}", e));
            Err(CanisterError::HandleApiError(e))
        }
    }
}

#[update(guard = "is_not_anonymous")]
async fn update_link(id: String, input: UpdateLinkInput) -> Result<LinkDetail, CanisterError> {
    let creator = ic_cdk::api::caller();

    // get link type
    let link = services::link::get_link_by_id(id.clone())
        .ok_or_else(|| CanisterError::HandleApiError("Link not found".to_string()))?;

    match is_link_creator(creator.to_text(), &id) {
        true => (),
        false => {
            return Err(CanisterError::HandleApiError(
                "Caller are not the creator of this link".to_string(),
            ))
        }
    }

    match link.link_type {
        Some(LinkType::NftCreateAndAirdrop) => {
            match handle_update_create_and_airdrop_nft(input.to_link_detail_update(), link) {
                Ok(link) => Ok(link),
                Err(e) => {
                    logger::error(&format!("Failed to update link: {}", e));
                    Err(CanisterError::HandleApiError(e))
                }
            }
        }
        Some(_) => {
            // Handle other link types if necessary
            ic_cdk::api::trap("Link type is not implemented");
        }
        None => {
            return Err(CanisterError::HandleApiError(
                "Link type is not found".to_string(),
            ));
        }
    }
}
