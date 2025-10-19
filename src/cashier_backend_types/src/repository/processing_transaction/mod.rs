// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repository::transaction::v1::Transaction;
use candid::CandidType;
use cashier_macros::storable;
use ic_mple_structures::Codec;

#[derive(Debug, Clone, PartialEq, Eq, CandidType)]
#[storable]
pub struct ProcessingTransaction {
    /// The transaction ID being tracked
    pub transaction_id: String,

    /// When the transaction started processing in nanoseconds
    pub start_time: u64,

    /// When the transaction will timeout in nanoseconds
    pub timeout_at: u64,
}

#[storable]
pub enum ProcessingTransactionCodec {
    V1(ProcessingTransaction),
}

impl Codec<ProcessingTransaction> for ProcessingTransactionCodec {
    fn decode(source: Self) -> ProcessingTransaction {
        match source {
            ProcessingTransactionCodec::V1(link) => link,
        }
    }

    fn encode(dest: ProcessingTransaction) -> Self {
        ProcessingTransactionCodec::V1(dest)
    }
}

impl ProcessingTransaction {
    pub fn new(transaction_id: String, start_time: u64, ttl_nanoseconds: u64) -> Self {
        Self {
            transaction_id,
            start_time,
            timeout_at: start_time + ttl_nanoseconds,
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
        (current_time - self.start_time) % check_interval_ns < check_interval_ns / 2
    }

    /// Calculate remaining time until timeout
    pub fn remaining_time_ns(&self, current_time: u64) -> Option<u64> {
        if current_time >= self.timeout_at {
            None
        } else {
            Some(self.timeout_at - current_time)
        }
    }

    pub fn from_tx_with_timeout(tx: &Transaction, timeout_threshold: u64) -> Self {
        Self {
            transaction_id: tx.id.clone(),
            start_time: tx.created_at,
            timeout_at: tx.created_at + timeout_threshold,
        }
    }
}
