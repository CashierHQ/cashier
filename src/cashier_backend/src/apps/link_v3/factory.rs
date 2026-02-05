// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::apps::link_v3::{links::tip_link::TipLink, traits::LinkV3};
use candid::Principal;
use cashier_backend_types::{
    dto::link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput},
    error::CanisterError,
    link_v3::api_args::CreateLinkV3Input,
    repository::{
        asset_info::AssetInfo,
        link::v1::{Link, LinkType},
    },
};
use std::rc::Rc;
use transaction_manager::traits::TransactionManagerV3;

pub struct LinkFactory<M: TransactionManagerV3 + 'static> {
    pub transaction_manager: Rc<M>,
}

impl<M: TransactionManagerV3 + 'static> LinkFactory<M> {
    pub fn new(transaction_manager: Rc<M>) -> Self {
        Self {
            transaction_manager,
        }
    }

    pub fn create_link_v3(
        &self,
        creator: Principal,
        input: CreateLinkV3Input,
        created_at_ts: u64,
        canister_id: Principal,
    ) -> Result<Link, CanisterError> {
        Ok(TipLink::create(
            creator,
            input.title,
            vec![],
            1u64,
            created_at_ts,
            canister_id,
            self.transaction_manager.clone(),
        )
        .link)
    }

    /// Converts a Link model to a corresponding LinkV2 instance.
    /// # Arguments
    /// * `link` - The Link model to convert.
    /// # Returns
    /// * `Result<Box<dyn LinkV3>, CanisterError>` - The resulting LinkV3 instance or an error if the conversion fails.
    pub fn create_from_link(
        &self,
        link: Link,
        canister_id: Principal,
    ) -> Result<Box<dyn LinkV3>, CanisterError> {
        Ok(Box::new(TipLink::new(
            link,
            canister_id,
            self.transaction_manager.clone(),
        )))
    }
}
