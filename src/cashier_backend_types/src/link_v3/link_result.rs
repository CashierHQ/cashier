// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    link_v3::action_result::{CreateActionResult, ProcessActionResult},
    repository::link::v3::LinkV3,
};

#[derive(Debug, Clone)]
pub struct LinkCreateActionResult {
    pub link: LinkV3,
    pub create_action_result: CreateActionResult,
}

#[derive(Debug, Clone)]
pub struct LinkProcessActionResult {
    pub link: LinkV3,
    pub process_action_result: ProcessActionResult,
}
