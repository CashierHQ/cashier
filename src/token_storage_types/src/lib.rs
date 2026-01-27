// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;

pub mod auth;
pub mod bitcoin;
pub mod dto;
pub mod error;
pub mod icrc7;
pub mod init;
pub mod nft;
pub mod token;
pub mod user;

pub type LedgerId = Principal;
pub type IndexId = Principal;

pub use token::TokenId;
