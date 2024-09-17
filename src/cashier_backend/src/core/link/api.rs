use ic_cdk::{query, update};

use crate::{
    core::PaginateResult,
    services::{self, link::create_new},
    types::{api::PaginateInput, error::CanisterError, link_detail::LinkDetail},
    utils::logger,
};

use super::types::CreateLinkInput;

#[query]
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

#[update]
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
