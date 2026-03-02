// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        asset_info::v3::AssetInfoV3,
        link::{v1::LinkType, v3::LinkV3},
    },
};

use crate::apps::link_v3::links::{
    LinkV3Types, airdrop_link::AirdropLink, tip_link::TipLink, token_basket_link::TokenBasketLink,
};

pub struct LinkFactoryV3;

impl LinkFactoryV3 {
    pub fn create_link(
        link_type: LinkType,
        title: String,
        asset_info: Vec<AssetInfoV3>,
        max_use: u64,
        creator: Principal,
        created_at_ts: u64,
        canister_id: Principal,
    ) -> Result<LinkV3, CanisterError> {
        match link_type {
            LinkType::SendTip => {
                Ok(TipLink::create(creator, title, asset_info, created_at_ts, canister_id).link)
            }
            LinkType::SendAirdrop => Ok(AirdropLink::create(
                creator,
                title,
                asset_info,
                max_use,
                created_at_ts,
                canister_id,
            )
            .link),
            LinkType::SendTokenBasket => Ok(TokenBasketLink::create(
                creator,
                title,
                asset_info,
                max_use,
                created_at_ts,
                canister_id,
            )
            .link),
            _ => Err(CanisterError::InvalidInput(
                "Unsupported link type".to_string(),
            )),
        }
    }

    /// Converts a Link model to a corresponding LinkV3 instance.
    /// # Arguments
    /// * `link` - The Link model to convert.
    /// # Returns
    /// * `Result<Box<dyn LinkV3>, CanisterError>` - The resulting LinkV3 instance or an error if the conversion fails.
    pub fn create_from_link_model(
        link: LinkV3,
        canister_id: Principal,
    ) -> Result<LinkV3Types, CanisterError> {
        match link.link_type {
            LinkType::SendTip => Ok(LinkV3Types::TipLink(TipLink::new(link, canister_id))),
            LinkType::SendAirdrop => Ok(LinkV3Types::AirdropLink(AirdropLink::new(
                link,
                canister_id,
            ))),
            LinkType::SendTokenBasket => Ok(LinkV3Types::TokenBasketLink(TokenBasketLink::new(
                link,
                canister_id,
            ))),
            _ => Err(CanisterError::InvalidInput(
                "Unsupported link type".to_string(),
            )),
        }
    }
}
