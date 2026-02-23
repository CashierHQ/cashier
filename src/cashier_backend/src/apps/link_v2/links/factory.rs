// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::link_v2::links::{
    airdrop_link::AirdropLink, payment_link::PaymentLink, tip_link::TipLink,
    token_basket_link::TokenBasketLink, traits::LinkV2,
};
use candid::Principal;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput},
    error::CanisterError,
    repository::{
        asset_info::v1::AssetInfo,
        link::v1::{Link, LinkType},
    },
};
use std::rc::Rc;
use transaction_manager::v2::traits::TransactionManager;

/// Parameters for creating a link V3
pub struct CreateLinkParamsV3 {
    pub link_type: LinkType,
    pub title: String,
    pub asset_info: Vec<AssetInfo>,
    pub max_use_count: u64,
    pub creator: Principal,
    pub created_at_ts: u64,
    pub canister_id: Principal,
}

pub struct LinkFactory<M: TransactionManager + 'static> {
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManager + 'static> LinkFactory<M> {
    pub fn new(transaction_manager: Rc<M>) -> Self {
        Self {
            transaction_manager,
        }
    }

    /// Creates a new LinkV2 instance based on the provided input.
    /// # Arguments
    /// * `creator` - The principal of the user creating the link
    /// * `input` - The input data for creating the link.
    /// * `created_at_ts` - The timestamp when the link is created
    /// # Returns
    /// * `Result<Box<dyn LinkV2>, CanisterError>` - The resulting LinkV2 instance or an error if the creation fails.
    pub fn create_link(
        &self,
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
                self.transaction_manager.clone(),
            )
            .link),
            LinkType::SendAirdrop => Ok(AirdropLink::create(
                creator,
                input.title,
                asset_info,
                input.link_use_action_max_count,
                created_at_ts,
                canister_id,
                self.transaction_manager.clone(),
            )
            .link),
            LinkType::SendTokenBasket => Ok(TokenBasketLink::create(
                creator,
                input.title,
                asset_info,
                input.link_use_action_max_count,
                created_at_ts,
                canister_id,
                self.transaction_manager.clone(),
            )
            .link),
            LinkType::ReceivePayment => Ok(PaymentLink::create(
                creator,
                input.title,
                asset_info,
                input.link_use_action_max_count,
                created_at_ts,
                canister_id,
                self.transaction_manager.clone(),
            )
            .link),
        }
    }

    pub fn create_link_v3(&self, params: CreateLinkParamsV3) -> Result<Link, CanisterError> {
        match params.link_type {
            LinkType::SendTip => Ok(TipLink::create(
                params.creator,
                params.title,
                params.asset_info,
                params.max_use_count,
                params.created_at_ts,
                params.canister_id,
                self.transaction_manager.clone(),
            )
            .link),
            LinkType::SendAirdrop => Ok(AirdropLink::create(
                params.creator,
                params.title,
                params.asset_info,
                params.max_use_count,
                params.created_at_ts,
                params.canister_id,
                self.transaction_manager.clone(),
            )
            .link),
            LinkType::SendTokenBasket => Ok(TokenBasketLink::create(
                params.creator,
                params.title,
                params.asset_info,
                params.max_use_count,
                params.created_at_ts,
                params.canister_id,
                self.transaction_manager.clone(),
            )
            .link),
            LinkType::ReceivePayment => Ok(PaymentLink::create(
                params.creator,
                params.title,
                params.asset_info,
                params.max_use_count,
                params.created_at_ts,
                params.canister_id,
                self.transaction_manager.clone(),
            )
            .link),
        }
    }

    /// Converts a Link model to a corresponding LinkV2 instance.
    /// # Arguments
    /// * `link` - The Link model to convert.
    /// # Returns
    /// * `Result<Box<dyn LinkV2>, CanisterError>` - The resulting LinkV2 instance or an error if the conversion fails.
    pub fn create_from_link(
        &self,
        link: Link,
        canister_id: Principal,
    ) -> Result<Box<dyn LinkV2>, CanisterError> {
        match link.link_type {
            LinkType::SendTip => Ok(Box::new(TipLink::new(
                link,
                canister_id,
                self.transaction_manager.clone(),
            ))),
            LinkType::SendAirdrop => Ok(Box::new(AirdropLink::new(
                link,
                canister_id,
                self.transaction_manager.clone(),
            ))),
            LinkType::SendTokenBasket => Ok(Box::new(TokenBasketLink::new(
                link,
                canister_id,
                self.transaction_manager.clone(),
            ))),
            LinkType::ReceivePayment => Ok(Box::new(PaymentLink::new(
                link,
                canister_id,
                self.transaction_manager.clone(),
            ))),
        }
    }
}
