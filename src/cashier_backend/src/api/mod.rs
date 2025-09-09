// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_common::build_data::BuildData;

pub mod action;
pub mod admin;
pub mod icrc;
pub mod init_and_upgrade;
mod inspect_message;
pub mod link;
mod state;

use candid::Principal;
use cashier_backend_types::auth::*;
use cashier_backend_types::dto::action::*;
use cashier_backend_types::dto::link::*;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::init::CashierBackendInitData;
use cashier_backend_types::service::link::*;
use cashier_common::icrc::*;

ic_cdk::export_candid!();
