use ic_cdk::{query, update};

use crate::{
    core::guard::is_not_anonymous,
    core::{PaginateResult, UpdateLinkInput},
    services::{
        self,
        link::{create_new, update},
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

    match update(creator.to_text(), id, input.to_link_detail_update()) {
        Ok(res) => Ok(res),
        Err(e) => {
            logger::error(&format!("Failed to update link: {}", e));
            Err(CanisterError::HandleApiError(e))
        }
    }
}
