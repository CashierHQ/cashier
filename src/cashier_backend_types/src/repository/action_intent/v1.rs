// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_macros::storable;
use ic_mple_structures::Codec;

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
#[storable]
pub struct ActionIntent {
    pub action_id: String,
    pub intent_id: String,
}

#[storable]
pub enum ActionIntentCodec {
    V1(ActionIntent),
}

impl Codec<ActionIntent> for ActionIntentCodec {
    fn decode(source: Self) -> ActionIntent {
        match source {
            ActionIntentCodec::V1(link) => link,
        }
    }

    fn encode(dest: ActionIntent) -> Self {
        ActionIntentCodec::V1(dest)
    }
}
