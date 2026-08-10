// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use derive_more::Display;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, CandidType, Display)]
pub enum LinkType {
    SendTip,
    SendAirdrop,
    SendTokenBasket,
    ReceivePayment,
}
