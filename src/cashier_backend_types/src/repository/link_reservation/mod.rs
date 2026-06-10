// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_macros::storable;

use crate::repository::action::v1::ActionType;

/// An in-flight reservation of one *use* of a link, held while an action is being processed.
///
/// Reservations are transient concurrency-control state (a TTL-leased "hold"), NOT durable
/// domain data: a successful action converts its reservation into a committed `use_count`
/// increment and the reservation is dropped; a failed/abandoned one is released (or expires
/// via TTL). Stored per link as `link_id -> Vec<LinkReservation>`.
///
/// `id` is the `action_id` (unique per claim attempt, retry-safe — a retry refreshes its own
/// reservation instead of consuming a second slot). `action_type` makes the reservation
/// generic so admission rules can differ per action (e.g. Receive/Send count against
/// `max_use`).
#[derive(Debug, Clone)]
#[storable]
pub struct LinkReservation {
    pub id: String,
    pub action_type: ActionType,
    pub timestamp: u64,
}

impl LinkReservation {
    /// Create a new reservation for `action_id` of `action_type` at `timestamp` (ns).
    pub fn new(id: String, action_type: ActionType, timestamp: u64) -> Self {
        Self {
            id,
            action_type,
            timestamp,
        }
    }
}
