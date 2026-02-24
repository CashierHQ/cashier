// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput},
    error::CanisterError,
    repository::{
        asset_info::AssetInfo,
        link::v1::{Link, LinkType},
    },
};

use crate::apps::link_v2::links::{
    LinkV2Types, airdrop_link::AirdropLink, payment_link::PaymentLink, tip_link::TipLink,
    token_basket_link::TokenBasketLink,
};

pub struct LinkFactory;

impl LinkFactory {
    /// Creates a new LinkV2 instance based on the provided input.
    /// # Arguments
    /// * `creator` - The principal of the user creating the link
    /// * `input` - The input data for creating the link.
    /// * `created_at_ts` - The timestamp when the link is created
    /// # Returns
    /// * `Result<Box<dyn LinkV2>, CanisterError>` - The resulting LinkV2 instance or an error if the creation fails.
    pub fn create_link(
        creator: Principal,
        input: CreateLinkInput,
        created_at_ts: u64,
        canister_id: Principal,
    ) -> Result<Link, CanisterError> {
        let asset_info: Vec<AssetInfo> = input
            .asset_info
            .iter()
            .map(LinkDetailUpdateAssetInfoInput::to_model)
            .collect();

        match input.link_type {
            LinkType::SendTip => Ok(TipLink::create(
                creator,
                input.title,
                asset_info,
                input.link_use_action_max_count,
                created_at_ts,
                canister_id,
            )
            .link),
            LinkType::SendAirdrop => Ok(AirdropLink::create(
                creator,
                input.title,
                asset_info,
                input.link_use_action_max_count,
                created_at_ts,
                canister_id,
            )
            .link),
            LinkType::SendTokenBasket => Ok(TokenBasketLink::create(
                creator,
                input.title,
                asset_info,
                input.link_use_action_max_count,
                created_at_ts,
                canister_id,
            )
            .link),
            LinkType::ReceivePayment => Ok(PaymentLink::create(
                creator,
                input.title,
                asset_info,
                input.link_use_action_max_count,
                created_at_ts,
                canister_id,
            )
            .link),
        }
    }

    /// Converts a Link model to a corresponding LinkV2 instance.
    /// # Arguments
    /// * `link` - The Link model to convert.
    /// # Returns
    /// * `Result<LinkV2Types, CanisterError>` - The resulting LinkV2 instance or an error if the conversion fails.
    pub fn create_from_link_model(
        link: Link,
        canister_id: Principal,
    ) -> Result<LinkV2Types, CanisterError> {
        match link.link_type {
            LinkType::SendTip => Ok(LinkV2Types::TipLink(TipLink::new(link, canister_id))),
            LinkType::SendAirdrop => Ok(LinkV2Types::AirdropLink(AirdropLink::new(
                link,
                canister_id,
            ))),
            LinkType::SendTokenBasket => Ok(LinkV2Types::TokenBasketLink(TokenBasketLink::new(
                link,
                canister_id,
            ))),
            LinkType::ReceivePayment => Ok(LinkV2Types::PaymentLink(PaymentLink::new(
                link,
                canister_id,
            ))),
        }
    }
}
