// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod admin;
pub mod bitcoin;
pub mod icrc;
mod init_and_upgrade;
mod inspect_message;
pub mod nft;
mod state;
pub mod token;
pub mod token_manager;

use candid::Principal;
use cashier_common::build_data::BuildData;
use cashier_common::icrc::{
    Icrc21ConsentInfo, Icrc21ConsentMessageRequest, Icrc21Error, Icrc21SupportedStandard,
    Icrc28TrustedOriginsResponse,
};
use token_storage_types::auth::*;
use token_storage_types::dto::{bitcoin::*, nft::*};
use token_storage_types::error::*;
use token_storage_types::init::*;
use token_storage_types::token::*;

ic_cdk::export_candid!();
