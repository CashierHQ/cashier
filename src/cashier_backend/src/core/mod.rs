// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::types::error::*;
use cashier_common::build_data::BuildData;

pub mod action;
pub mod admin;
pub mod guard;
pub mod icrc;
pub mod init_and_upgrade;
pub mod link;
pub mod migration;
pub mod user;

// #[cfg(test)]
// pub mod __tests__;

use cashier_common::icrc::*;
use cashier_types::dto::action::*;
use cashier_types::dto::link::*;
use cashier_types::dto::user::*;
use cashier_types::service::link::*;

ic_cdk::export_candid!();
