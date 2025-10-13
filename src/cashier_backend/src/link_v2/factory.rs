use crate::link_v2::{tip_link::TipLink, traits::LinkV2};
use cashier_backend_types::{
    dto::link::{CreateLinkInput, GetLinkResp},
    error::CanisterError,
    repository::link::v1::{Link, LinkType},
};

pub fn create_link(link_data: Link) -> Result<Box<dyn LinkV2>, CanisterError> {
    match link_data.link_type {
        LinkType::SendTip => Ok(Box::new(TipLink::new(link_data)) as Box<dyn LinkV2>),
        _ => Err(CanisterError::InvalidInput(
            "Unsupported link type".to_string(),
        )),
    }
}
