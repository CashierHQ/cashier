// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, CandidType, Deserialize, Serialize)]
pub struct UserDto {
    pub id: String,
    pub email: Option<String>,
    pub wallet: String,
}
