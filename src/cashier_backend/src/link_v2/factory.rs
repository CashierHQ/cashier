use crate::link_v2::{tip_link::TipLink, traits::LinkV2};
use candid::Principal;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, GetLinkResp},
    error::CanisterError,
    repository::link::v1::{Link, LinkType},
};

pub fn create_link(
    creator: Principal,
    input: CreateLinkInput,
    created_at_ts: u64,
) -> Result<Box<dyn LinkV2>, CanisterError> {
    match input.link_type {
        LinkType::SendTip => Ok(Box::new(TipLink::create(creator, input, created_at_ts))),
        _ => Err(CanisterError::InvalidInput(
            "Unsupported link type".to_string(),
        )),
    }
}

pub fn from_link(link: Link) -> Result<Box<dyn LinkV2>, CanisterError> {
    match link.link_type {
        LinkType::SendTip => Ok(Box::new(TipLink::new(link))),
        _ => Err(CanisterError::InvalidInput(
            "Unsupported link type".to_string(),
        )),
    }
}
