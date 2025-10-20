// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::traits::LinkV2State;
use cashier_backend_types::{
    error::CanisterError,
    repository::link::v1::{Link, LinkState},
};
use std::{fmt::Debug, future::Future, pin::Pin};

#[derive(Debug)]
pub struct ActiveState {
    pub link: Link,
}

impl ActiveState {
    pub fn new(link: &Link) -> Self {
        Self { link: link.clone() }
    }
}

impl LinkV2State for ActiveState {
    fn deactivate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link = self.link.clone();

        Box::pin(async move {
            link.state = LinkState::Inactive;
            Ok(link)
        })
    }
}
