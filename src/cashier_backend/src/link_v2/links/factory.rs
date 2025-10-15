use crate::link_v2::{links::tip_link::TipLink, traits::LinkV2};
use candid::Principal;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput},
    error::CanisterError,
    repository::{
        asset_info::AssetInfo,
        link::v1::{Link, LinkType},
    },
};

pub fn create_link(
    creator: Principal,
    input: CreateLinkInput,
    created_at_ts: u64,
) -> Result<Box<dyn LinkV2>, CanisterError> {
    let asset_info: Vec<AssetInfo> = input
        .asset_info
        .iter()
        .map(LinkDetailUpdateAssetInfoInput::to_model)
        .collect();

    match input.link_type {
        LinkType::SendTip => Ok(Box::new(TipLink::create(
            creator,
            input.title,
            asset_info,
            input.link_use_action_max_count,
            created_at_ts,
        ))),
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
