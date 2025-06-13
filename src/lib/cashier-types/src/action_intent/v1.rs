// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_macros::storable;

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
#[storable]
pub struct ActionIntent {
    pub action_id: String,
    pub intent_id: String,
}
