// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_macros::storable;
use ic_mple_structures::Codec;

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
#[storable]
pub struct IntentTransaction {
    pub intent_id: String,
    pub transaction_id: String,
}

#[storable]
pub enum IntentTransactionCodec {
    V1(IntentTransaction),
}

impl Codec<IntentTransaction> for IntentTransactionCodec {
    fn decode(source: Self) -> IntentTransaction {
        match source {
            IntentTransactionCodec::V1(link) => link,
        }
    }

    fn encode(dest: IntentTransaction) -> Self {
        IntentTransactionCodec::V1(dest)
    }
}
