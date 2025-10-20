// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::link_v2::traits::LinkV2State;
use cashier_backend_types::repository::link::v1::Link;
use std::fmt::Debug;

#[derive(Debug)]
pub struct EndedState {
    pub _link: Link,
}

impl EndedState {
    pub fn new(_link: &Link) -> Self {
        Self {
            _link: _link.clone(),
        }
    }
}

impl LinkV2State for EndedState {}
