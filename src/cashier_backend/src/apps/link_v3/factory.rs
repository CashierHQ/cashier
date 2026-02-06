// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::link_v3::{links::tip_link::TipLink, traits::LinkV3};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::dto::{
        action::{CreateActionInputV3, CreateActionResponseV3},
        link::{CreateLinkInputV3, CreateLinkResponseV3},
    },
    repository::{
        asset_info::AssetInfo,
        link::v1::{Link, LinkType},
    },
};
use cashier_shared::types::LinkType as LinkTypeShared;
use std::rc::Rc;
use transaction_manager::v2::traits::TransactionManager;

pub struct LinkFactoryV3<M: TransactionManager + 'static> {
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManager + 'static> LinkFactoryV3<M> {
    pub fn new(transaction_manager: Rc<M>) -> Self {
        Self {
            transaction_manager,
        }
    }

    pub fn create_link(
        &self,
        link_type: LinkType,
        title: String,
        asset_info: Vec<AssetInfo>,
        max_use_count: u64,
        creator: Principal,
        created_at_ts: u64,
        canister_id: Principal,
    ) -> Result<Link, CanisterError> {
        match link_type {
            LinkType::SendTip => Ok(TipLink::create(
                creator,
                title,
                asset_info,
                created_at_ts,
                canister_id,
                self.transaction_manager.clone(),
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
    pub fn create_from_link(
        &self,
        link: Link,
        canister_id: Principal,
    ) -> Result<Box<dyn LinkV3>, CanisterError> {
        match link.link_type {
            LinkType::SendTip => Ok(Box::new(TipLink::new(
                link,
                canister_id,
                self.transaction_manager.clone(),
            ))),
            _ => Err(CanisterError::InvalidInput(
                "Unsupported link type".to_string(),
            )),
        }
    }
}
