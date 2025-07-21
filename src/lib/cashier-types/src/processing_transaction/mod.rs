// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use cashier_macros::storable;

#[derive(Debug, Clone, PartialEq, Eq, CandidType)]
#[storable]
pub struct ProcessingTransaction {
    /// The transaction ID being tracked
    pub transaction_id: String,

    /// When the transaction started processing (nanoseconds since epoch)
    pub start_time: u64,

    /// When the transaction will timeout (nanoseconds since epoch)
    pub timeout_at: u64,

    /// Creation timestamp for this tracking record
    pub created_at: u64,
}

impl ProcessingTransaction {
    pub fn new(transaction_id: String, start_time: u64, ttl_nanoseconds: u64) -> Self {
        Self {
            transaction_id,
            start_time,
            timeout_at: start_time + ttl_nanoseconds,
            created_at: start_time,
        }
    }

    /// Check if this transaction has timed out
    pub fn is_timed_out(&self, current_time: u64) -> bool {
        current_time >= self.timeout_at
    }

    /// Check if this transaction is due for a status check
    pub fn is_due_for_check(&self, current_time: u64, check_interval_ns: u64) -> bool {
        // Simple interval check based on creation time
        // This ensures we check periodically without tracking last check time
        (current_time - self.created_at) % check_interval_ns < check_interval_ns / 2
    }

    /// Calculate remaining time until timeout
    pub fn remaining_time_ns(&self, current_time: u64) -> Option<u64> {
        if current_time >= self.timeout_at {
            None
        } else {
            Some(self.timeout_at - current_time)
        }
    }
}
