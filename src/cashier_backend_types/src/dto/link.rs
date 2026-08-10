// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;

use serde::{Deserialize, Serialize};

use crate::repository::action::v1::ActionType;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct GetLinkOptions {
    pub action_type: ActionType,
}
